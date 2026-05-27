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
    """
    Purpose:
        Registers a new user account.

    Responsibilities:
        - Validate email uniqueness
        - Hash raw password
        - Persist user to database
        - Generate initial access token

    Args:
        request (Request):
            FastAPI request object for rate limiting.

        payload (UserCreate):
            User registration data including email and password.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        TokenResponse:
            Access token and sanitized user profile.

    Raises:
        HTTPException:
            409 Conflict if email is already registered.

    Side Effects:
        - Inserts a new record into the users table.

    Flow:
        1. Check if email already exists in repository.
        2. Hash the password using security utilities.
        3. Create user record.
        4. Generate JWT access token for the new user.
        5. Return token and user read schema.
    """
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
    """
    Purpose:
        Authenticates a user and provides an access token.

    Responsibilities:
        - Verify user existence by email
        - Validate password hash
        - Issue JWT access token

    Args:
        request (Request):
            FastAPI request object for rate limiting.

        payload (UserCreate):
            Credentials including email and password.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        TokenResponse:
            Access token and sanitized user profile.

    Raises:
        HTTPException:
            401 Unauthorized if credentials are invalid.

    Flow:
        1. Retrieve user by email from repository.
        2. Compare provided password with stored hash.
        3. Generate access token for authenticated user.
        4. Return token and user read schema.
    """
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
    """
    Purpose:
        Retrieves the profile of the currently authenticated user.

    Args:
        current_user (Annotated[User, Depends(get_current_user)]):
            The user object injected by the auth dependency.

    Returns:
        User:
            The authenticated user instance.
    """
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Purpose:
        Updates profile preferences and settings for the authenticated user.

    Responsibilities:
        - Filter provided update fields
        - Apply partial updates via repository

    Args:
        payload (UserUpdate):
            Optional fields to update (display name, theme, etc.).

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user to be updated.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        User:
            The updated user instance.

    Side Effects:
        - Updates user record in the database.

    Flow:
        1. Identify fields set in the request payload.
        2. Construct update map.
        3. Return current user if no changes requested.
        4. Persist updates via UserRepository.
    """
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
    """
    Purpose:
        Allows an authenticated user to change their password.

    Responsibilities:
        - Validate the current password
        - Hash the new password
        - Update user record

    Args:
        request (Request):
            FastAPI request object for rate limiting.

        payload (ChangePasswordRequest):
            Contains current and new passwords.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        None

    Raises:
        HTTPException:
            401 Unauthorized if the current password is incorrect.

    Side Effects:
        - Updates the password hash in the users table.

    Flow:
        1. Verify current password against stored hash.
        2. Hash new password.
        3. Update user record via repository.
    """
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
    """
    Purpose:
        Initiates the password reset process for a user.

    Responsibilities:
        - Locate user by email
        - Generate secure reset token
        - Deliver reset link via logs (dev) or email (prod)

    Args:
        request (Request):
            FastAPI request object for rate limiting.

        payload (ForgotPasswordRequest):
            Contains the user's email.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        None

    Side Effects:
        - Generates a reset token.
        - Logs the reset link to the console in development.

    Flow:
        1. Lookup user by email.
        2. Return silently if user not found to prevent account enumeration.
        3. Generate a time-limited reset token.
        4. Construct magic link.
        5. Log link to console for local development.
    """
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
    """
    Purpose:
        Completes the password reset process using a valid token.

    Responsibilities:
        - Decode and validate the reset token
        - Verify user existence
        - Update user password

    Args:
        request (Request):
            FastAPI request object for rate limiting.

        payload (ResetPasswordRequest):
            Contains the reset token and the new password.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        None

    Raises:
        HTTPException:
            400 Bad Request if the token is invalid or expired.
            404 Not Found if the user associated with the token no longer exists.

    Side Effects:
        - Updates the password hash in the users table.

    Flow:
        1. Decode the reset token to retrieve user ID.
        2. Fetch user by ID from repository.
        3. Hash the new password.
        4. Update user password via repository.
    """
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
