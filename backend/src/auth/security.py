import base64
import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from jose import JWTError, jwt

from src.core.config import get_settings

PBKDF2_ITERATIONS = 260_000
TOKEN_EXPIRE_MINUTES = 60 * 24


def hash_password(password: str) -> str:
    """
    Purpose:
        Hashes a plain-text password using PBKDF2-SHA256 with a random salt.

    Args:
        password (str):
            The plain-text password to hash.

    Returns:
        str:
            A formatted hash string containing algorithm, iterations, salt, and digest.

    Side Effects:
        - Generates 16 bytes of cryptographically secure random salt.

    Flow:
        1. Generate a 16-byte random salt.
        2. Compute PBKDF2-HMAC-SHA256 digest using specified iterations.
        3. Base64 encode the salt and digest.
        4. Format as a string: `pbkdf2_sha256$<iterations>$<salt>$<digest>`.
    """
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return (
        f"pbkdf2_sha256${PBKDF2_ITERATIONS}$"
        f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"
    )


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Purpose:
        Verifies that a plain-text password matches a previously stored PBKDF2 hash.

    Args:
        password (str):
            The plain-text password to verify.

        hashed_password (str):
            The hashed password string in the format `pbkdf2_sha256$<iterations>$<salt>$<digest>`.

    Returns:
        bool:
            True if the password is valid, False otherwise.

    Flow:
        1. Split the hashed password string into components.
        2. Validate that the algorithm is `pbkdf2_sha256`.
        3. Decode the Base64 salt and digest.
        4. Recompute the PBKDF2-HMAC-SHA256 digest using the provided password and salt.
        5. Use `secrets.compare_digest` to prevent timing attacks.
    """
    try:
        algorithm, iterations, salt_b64, digest_b64 = hashed_password.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected_digest = base64.b64decode(digest_b64)
        actual_digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
    except (ValueError, TypeError):
        return False

    return secrets.compare_digest(actual_digest, expected_digest)


def create_access_token(user_id: UUID) -> str:
    """
    Purpose:
        Generates a JWT access token for a user.

    Args:
        user_id (UUID):
            The unique identifier of the user.

    Returns:
        str:
            An encoded JWT access token.

    Side Effects:
        - Reads JWT secret and algorithm from global settings.

    Flow:
        1. Set expiration time (now + TOKEN_EXPIRE_MINUTES).
        2 la. Define payload with subject (user_id) and expiration.
        3. Encode the payload using the configured secret and algorithm.
    """
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> UUID | None:
    """
    Purpose:
        Decodes a JWT access token to retrieve the user's unique identifier.

    Args:
        token (str):
            The JWT access token to decode.

    Returns:
        UUID | None:
            The user's UUID if the token is valid and not a reset token; otherwise, None.

    Flow:
        1. Decode the token using the configured secret and algorithm.
        2. Verify the token does not have a "password_reset" purpose.
        3. Extract and return the subject (user_id) as a UUID.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("purpose") == "password_reset":
            return None # Don't allow reset tokens to be used as access tokens
        subject = payload.get("sub")
        return UUID(subject) if subject else None
    except (JWTError, ValueError, TypeError):
        return None

def create_reset_token(user_id: UUID) -> str:
    """
    Purpose:
        Generates a short-lived JWT token specifically for password resets.

    Args:
        user_id (UUID):
            The unique identifier of the user.

    Returns:
        str:
            An encoded JWT token with a "password_reset" purpose.

    Side Effects:
        - Reads JWT secret and algorithm from global settings.

    Flow:
        1. Set a short expiration time (15 minutes).
        2. Define payload with subject and "password_reset" purpose.
        3. Encode the payload using the configured secret and algorithm.
    """
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=15) # Short expiry for reset
    payload = {"sub": str(user_id), "exp": expires_at, "purpose": "password_reset"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_reset_token(token: str) -> UUID | None:
    """
    Purpose:
        Decodes a JWT token and validates that it is intended for password resets.

    Args:
        token (str):
            The JWT reset token to decode.

    Returns:
        UUID | None:
            The user's UUID if the token is valid and has the correct purpose; otherwise, None.

    Flow:
        1. Decode the token using the configured secret and algorithm.
        2. Verify that the "purpose" claim equals "password_reset".
        3. Extract and return the subject (user_id) as a UUID.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("purpose") != "password_reset":
            return None
        subject = payload.get("sub")
        return UUID(subject) if subject else None
    except (JWTError, ValueError, TypeError):
        return None
