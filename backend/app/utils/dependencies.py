from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.repositories.users import UserRepository
from app.utils.database import get_db
from app.utils.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: str | None = Depends(oauth2_scheme),
    agentic_rag_token: Annotated[str | None, Cookie(alias="agentic-rag-token")] = None,
) -> User:
    """
    Purpose:
        Authenticates the current request and provides the corresponding User object.

    Responsibilities:
        - Resolve auth token from either the Authorization header or a secure cookie.
        - Validate the JWT access token.
        - Retrieve the user from the database.

    Args:
        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

        token (str | None):
            JWT token provided via OAuth2 scheme (Header).

        agentic_rag_token (Annotated[str | None, Cookie(alias="agentic-rag-token")]):
            JWT token provided via a cookie (used for media playback/frontend flexibility).

    Returns:
        User:
            The authenticated user object.

    Raises:
        HTTPException:
            401 Unauthorized if no token is provided, the token is invalid, or the user
            no longer exists.

    Flow:
        1. Prioritize the header token, falling back to the cookie token.
        2. Raise 401 if no token is found.
        3. Decode the token to retrieve the user ID.
        4. Fetch the user from the UserRepository.
        5. Return the user if found; otherwise, raise 401.
    """
    # Use cookie if header token is missing (useful for media playback)
    auth_token = token or agentic_rag_token

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user_id = decode_access_token(auth_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    user = await UserRepository(db).get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    return user
