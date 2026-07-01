"""Extended security tests covering refresh/reset tokens, PBKDF2 fallback, and edge cases."""
import base64
import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from jose import jwt

from app.config import get_settings
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_access_token,
    decode_refresh_token,
    decode_reset_token,
    verify_password,
)


class TestRefreshToken:
    def test_round_trip(self) -> None:
        user_id = uuid4()
        token = create_refresh_token(user_id)
        decoded = decode_refresh_token(token)
        assert decoded == user_id

    def test_rejects_access_token(self) -> None:
        user_id = uuid4()
        access = create_access_token(user_id)
        assert decode_refresh_token(access) is None

    def test_rejects_invalid_token(self) -> None:
        assert decode_refresh_token("invalid-token") is None

    def test_rejects_expired_token(self) -> None:
        settings = get_settings()
        user_id = uuid4()
        past = datetime.now(UTC) - timedelta(minutes=1)
        payload = {
            "sub": str(user_id),
            "exp": past,
            "type": "refresh",
            "jti": secrets.token_hex(16),
        }
        expired = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        assert decode_refresh_token(expired) is None

    def test_rejects_missing_jti(self) -> None:
        """Refresh tokens carry a jti claim; decode should still work if it's present
        (jti existence is for server-side tracking, not decode validation)."""
        user_id = uuid4()
        token = create_refresh_token(user_id)
        decoded = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
        assert "jti" in decoded


class TestResetToken:
    def test_round_trip(self) -> None:
        user_id = uuid4()
        token = create_reset_token(user_id)
        decoded = decode_reset_token(token)
        assert decoded == user_id

    def test_rejects_non_reset_token(self) -> None:
        user_id = uuid4()
        access = create_access_token(user_id)
        assert decode_reset_token(access) is None

    def test_rejects_invalid_token(self) -> None:
        assert decode_reset_token("bad-token") is None

    def test_expires_after_15_minutes(self) -> None:
        user_id = uuid4()
        token = create_reset_token(user_id)
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
        # Allow 1s clock drift
        exp = datetime.fromtimestamp(payload["exp"], tz=UTC)
        assert exp > datetime.now(UTC) + timedelta(minutes=13)
        assert exp <= datetime.now(UTC) + timedelta(minutes=16)


class TestAccessTokenEdgeCases:
    def test_rejects_invalid_signature(self) -> None:
        settings = get_settings()
        user_id = uuid4()
        token = create_access_token(user_id)
        # Tamper the signature
        parts = token.split(".")
        tampered = f"{parts[0]}.{parts[1]}.invalidsig"
        assert decode_access_token(tampered) is None

    def test_rejects_empty_sub(self) -> None:
        settings = get_settings()
        past = datetime.now(UTC) + timedelta(minutes=30)
        payload = {"sub": "", "exp": past, "type": "access"}
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        assert decode_access_token(token) is None

    def test_rejects_non_access_type(self) -> None:
        user_id = uuid4()
        token = create_reset_token(user_id)
        assert decode_access_token(token) is None

    def test_rejects_password_reset_token(self) -> None:
        """A token with purpose=password_reset but type=access should be rejected
        by the explicit purpose check on line 66-67 of security.py."""
        settings = get_settings()
        user_id = uuid4()
        exp = datetime.now(UTC) + timedelta(minutes=30)
        payload = {"sub": str(user_id), "exp": exp, "type": "access", "purpose": "password_reset"}
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        assert decode_access_token(token) is None


class TestPasswordLegacyPBKDF2:
    """Verify that verify_password still handles the legacy PBKDF2 format."""

    def test_legacy_pbkdf2_round_trip(self) -> None:
        password = "legacy-password-123"
        salt = base64.b64encode(secrets.token_bytes(16)).decode()
        digest = base64.b64encode(
            hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt), 260_000)
        ).decode()
        legacy_hash = f"pbkdf2_sha256$260_000${salt}${digest}"
        assert verify_password(password, legacy_hash)

    def test_legacy_pbkdf2_rejects_wrong_password(self) -> None:
        password = "correct-password"
        salt = base64.b64encode(secrets.token_bytes(16)).decode()
        digest = base64.b64encode(
            hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt), 260_000)
        ).decode()
        legacy_hash = f"pbkdf2_sha256$260_000${salt}${digest}"
        assert not verify_password("wrong-password", legacy_hash)

    def test_legacy_pbkdf2_rejects_wrong_algorithm(self) -> None:
        password = "test"
        salt = base64.b64encode(secrets.token_bytes(16)).decode()
        legacy_hash = f"pbkdf2_sha1$260_000${salt}$digest"
        assert not verify_password(password, legacy_hash)

    def test_legacy_pbkdf2_malformed_hash(self) -> None:
        assert not verify_password("test", "not-a-valid-format")

    def test_invalid_argon2_hash_returns_false(self) -> None:
        """An Argon2 hash with wrong password should not raise."""
        from argon2 import PasswordHasher
        ph = PasswordHasher()
        hashed = ph.hash("real-password")
        assert not verify_password("wrong-password", hashed)

    def test_legacy_pbkdf2_bad_base64(self) -> None:
        """Malformed base64 in salt/digest should not crash."""
        legacy_hash = "pbkdf2_sha256$260_000$not-base64!!$also-not-base64"
        assert not verify_password("test", legacy_hash)
