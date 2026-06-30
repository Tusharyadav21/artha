from uuid import uuid4

from app.utils.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_round_trip() -> None:
    hashed = hash_password("local-first-rag")

    assert hashed != "local-first-rag"
    assert verify_password("local-first-rag", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_round_trip() -> None:
    user_id = uuid4()
    token = create_access_token(user_id)

    assert decode_access_token(token) == user_id
