from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.auth.security import (
    create_access_token,
    create_reset_token,
    decode_reset_token,
    hash_password,
    verify_password,
)
from src.core.database import get_db
from src.core.rate_limit import limiter
from src.domain.models import User
from src.repositories.users import UserRepository
from src.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserRead,
    UserUpdate,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


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

    return TokenResponse(
        access_token=create_access_token(user.id),
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

    return TokenResponse(
        access_token=create_access_token(user.id),
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
        import structlog
        logger = structlog.get_logger(__name__)
        logger.warning("forgot_password_user_not_found", email=payload.email)
        # Avoid user enumeration by returning 204 even if user not found
        return

    token = create_reset_token(user.id)
    
    # In development, we log the magic link to the console
    from src.core.config import get_settings
    settings = get_settings()
    
    # Assuming frontend is at localhost:3000 for local dev
    magic_link = f"http://localhost:3000/auth/reset-password?token={token}"
    
    import structlog
    logger = structlog.get_logger(__name__)
    logger.info("password_reset_link", email=user.email, link=magic_link)
    
    # Also print directly to ensure visibility in all environments
    print(f"\n\n[DEVELOPMENT] PASSWORD RESET LINK FOR {user.email}:\n{magic_link}\n\n", flush=True)
    
    # In production, you would send an email here


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
