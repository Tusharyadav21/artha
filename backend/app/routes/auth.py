import logging
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt as jose_jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.models.user import User
from app.services.repositories.platform import PlatformRepository
from app.services.repositories.users import UserRepository
from app.utils.database import get_db
from app.utils.dependencies import get_current_user
from app.utils.rate_limit import limiter
from app.utils.redis_client import get_redis
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_refresh_token,
    decode_reset_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = structlog.get_logger(__name__)
_log = logging.getLogger(__name__)


async def _store_refresh_token(user_id: str, token: str) -> None:
    """Store refresh token in Redis for revocation support."""
    settings = get_settings()
    payload = jose_jwt.decode(
        token, settings.jwt_secret, algorithms=[settings.jwt_algorithm],
    )
    jti = payload.get("jti")
    if not jti:
        return
    try:
        r = get_redis()
        await r.set(
            f"refresh_token:{jti}",
            user_id,
            ex=settings.jwt_refresh_token_expire_minutes * 60,
        )
    except Exception as exc:
        _log.warning("Failed to store refresh token in Redis: %s", exc)


async def _revoke_refresh_token(token: str) -> None:
    """Revoke a refresh token by deleting its Redis entry."""
    try:
        payload = jose_jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[get_settings().jwt_algorithm],
        )
        jti = payload.get("jti")
        if jti:
            r = get_redis()
            await r.delete(f"refresh_token:{jti}")
    except Exception:
        pass


async def _refresh_token_is_valid(token: str) -> bool:
    """Check if a refresh token exists in Redis (not revoked)."""
    try:
        payload = jose_jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[get_settings().jwt_algorithm],
        )
        jti = payload.get("jti")
        if not jti:
            return False
        r = get_redis()
        stored = await r.get(f"refresh_token:{jti}")
        return stored is not None
    except Exception:
        return False


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    repository = UserRepository(db)
    if await repository.get_by_email(payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    try:
        user = await repository.create(payload.email, hash_password(payload.password))
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from exc

    # Auto-create a default workspace for the new user
    platform_repo = PlatformRepository(db)
    from app.models.agent import Workspace
    workspace = Workspace(name=f"{payload.email.split('@')[0]}'s Workspace", owner_id=user.id)
    try:
        await platform_repo.create_workspace(workspace)
    except IntegrityError:
        await db.rollback()
        # Non-fatal — workspace creation is a UX convenience, not auth-critical
        _log.warning("Workspace creation failed for user %s", user.id)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    await _store_refresh_token(str(user.id), refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    user = await UserRepository(db).get_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    await _store_refresh_token(str(user.id), refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserRead.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    payload: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    if not await _refresh_token_is_valid(payload.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired or revoked",
        )

    user_id = decode_refresh_token(payload.refresh_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = await UserRepository(db).get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Rotate: revoke old token, issue new pair
    await _revoke_refresh_token(payload.refresh_token)

    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)
    await _store_refresh_token(str(user.id), new_refresh)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
async def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    updates: dict[str, object] = {}
    if "display_name" in payload.model_fields_set:
        updates["display_name"] = payload.display_name
    if "theme_preference" in payload.model_fields_set:
        updates["theme_preference"] = payload.theme_preference
    if "default_home_tab" in payload.model_fields_set:
        updates["default_home_tab"] = payload.default_home_tab
    if "sidebar_collapsed" in payload.model_fields_set:
        updates["sidebar_collapsed"] = payload.sidebar_collapsed
    if "new_chat_scope_mode" in payload.model_fields_set:
        updates["new_chat_scope_mode"] = payload.new_chat_scope_mode

    if not updates:
        return current_user

    return await UserRepository(db).update(current_user, **updates)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )
    await UserRepository(db).update_password(current_user, hash_password(payload.new_password))


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    user = await UserRepository(db).get_by_email(payload.email)
    if not user:
        logger.warning("forgot_password_user_not_found", email=payload.email)
        return

    token = create_reset_token(user.id)
    magic_link = f"http://localhost:3000/auth/reset-password?token={token}"
    logger.info("password_reset_link", email=user.email, link=magic_link)
    print(f"\n\n[DEVELOPMENT] PASSWORD RESET LINK FOR {user.email}:\n{magic_link}\n\n", flush=True)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    user_id = decode_reset_token(payload.token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user = await UserRepository(db).get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await UserRepository(db).update_password(user, hash_password(payload.new_password))
