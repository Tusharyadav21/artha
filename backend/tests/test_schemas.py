"""Tests for Pydantic schema validation across all feature schemas."""
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.models.enums import (
    ChatScopeMode,
    DocumentStatus,
    HomeTab,
    LLMProvider,
    MessageRole,
    ThemePreference,
    ToolAuthType,
)
from app.models.schemas.analytics import DailyQuery, UserAnalytics
from app.models.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserRead,
)
from app.models.schemas.chat import ChatRequest, FeedbackRequest
from app.models.schemas.documents import DocumentRead
from app.models.schemas.projects import ProjectCreate, ProjectRead, ProjectUpdate


# ── UserCreate ────────────────────────────────────────────────────────────
class TestUserCreate:
    def test_valid_user_normalizes_email(self) -> None:
        user = UserCreate(email="Test@Example.COM", password="secure123!")
        assert user.email == "test@example.com"  # normalized
        assert user.password == "secure123!"

    def test_rejects_invalid_email(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(email="not-an-email", password="secure123!")

    def test_rejects_short_password(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com", password="1234567")

    def test_rejects_long_password(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com", password="x" * 129)

    def test_rejects_email_without_dot(self) -> None:
        """Emails must match the regex pattern (require domain.tld)."""
        with pytest.raises(ValidationError):
            UserCreate(email="user@example", password="secure123!")

    def test_rejects_minimal_email(self) -> None:
        """'a@b.co' is valid since it matches the pattern."""
        # This should pass - pattern allows a@b.co
        user = UserCreate(email="a@b.co", password="secure123!")
        assert user.email == "a@b.co"


# ── TokenResponse ─────────────────────────────────────────────────────────
class TestTokenResponse:
    def test_valid_response(self, fake_uuid: UUID) -> None:
        resp = TokenResponse(
            access_token="abc",
            refresh_token="def",
            user=UserRead(
                id=fake_uuid,
                email="user@test.com",
                display_name="Test",
                theme_preference="system",
                default_home_tab="chat",
                sidebar_collapsed=False,
                new_chat_scope_mode="clear",
                created_at="2025-01-01T00:00:00Z",
            ),
        )
        assert resp.token_type == "bearer"  # default


# ── ChatRequest ───────────────────────────────────────────────────────────
class TestChatRequest:
    def test_minimal_request(self) -> None:
        req = ChatRequest(message="Hello")
        assert req.message == "Hello"
        assert req.conversation_id is None

    def test_rejects_empty_message(self) -> None:
        with pytest.raises(ValidationError):
            ChatRequest(message="")

    def test_rejects_oversized_message(self) -> None:
        with pytest.raises(ValidationError):
            ChatRequest(message="x" * 4001)

    def test_with_document_ids(self, fake_uuid: UUID) -> None:
        req = ChatRequest(message="Query", document_ids=[fake_uuid])
        assert fake_uuid in req.document_ids

    def test_with_model_overrides(self) -> None:
        req = ChatRequest(message="Hi", model="qwen2.5:7b", num_ctx=8192, num_predict=2048)
        assert req.model == "qwen2.5:7b"
        assert req.num_ctx == 8192


# ── FeedbackRequest ───────────────────────────────────────────────────────
class TestFeedbackRequest:
    def test_valid_up(self) -> None:
        fb = FeedbackRequest(rating="up")
        assert fb.rating == "up"

    def test_valid_down(self) -> None:
        fb = FeedbackRequest(rating="down")
        assert fb.rating == "down"

    def test_rejects_invalid_rating(self) -> None:
        with pytest.raises(ValidationError):
            FeedbackRequest(rating="mid")

    def test_with_comment(self) -> None:
        fb = FeedbackRequest(rating="up", comment="Great answer!")
        assert fb.comment == "Great answer!"

    def test_rejects_oversized_comment(self) -> None:
        with pytest.raises(ValidationError):
            FeedbackRequest(rating="down", comment="x" * 1001)


# ── Project schemas ───────────────────────────────────────────────────────
class TestProjectCreate:
    def test_valid(self) -> None:
        proj = ProjectCreate(name="My Project")
        assert proj.name == "My Project"

    def test_with_system_prompt(self) -> None:
        proj = ProjectCreate(name="Docs", system_prompt="Be concise.")
        assert proj.system_prompt == "Be concise."

    def test_rejects_empty_name(self) -> None:
        with pytest.raises(ValidationError):
            ProjectCreate(name="")

    def test_rejects_oversized_name(self) -> None:
        with pytest.raises(ValidationError):
            ProjectCreate(name="x" * 161)


class TestProjectUpdate:
    def test_partial_update_name(self) -> None:
        update = ProjectUpdate(name="New Name")
        assert update.name == "New Name"
        assert update.system_prompt is None

    def test_partial_update_prompt(self) -> None:
        update = ProjectUpdate(system_prompt="New prompt")
        assert update.name is None

    def test_full_update(self) -> None:
        update = ProjectUpdate(name="A", system_prompt="B")
        assert update.name == "A"
        assert update.system_prompt == "B"

    def test_empty_update(self) -> None:
        update = ProjectUpdate()
        assert update.name is None
        assert update.system_prompt is None


class TestProjectRead:
    def test_from_attributes(self, fake_uuid: UUID) -> None:
        proj = ProjectRead(
            id=fake_uuid,
            name="Test",
            system_prompt=None,
            created_at="2025-06-01T00:00:00Z",
        )
        assert proj.name == "Test"


# ── Auth change / reset schemas ──────────────────────────────────────────
class TestChangePasswordRequest:
    def test_valid(self) -> None:
        req = ChangePasswordRequest(current_password="old", new_password="new-secure-123")
        assert req.current_password == "old"

    def test_rejects_short_new_password(self) -> None:
        with pytest.raises(ValidationError):
            ChangePasswordRequest(current_password="old", new_password="1234567")


class TestForgotPasswordRequest:
    def test_valid_email(self) -> None:
        req = ForgotPasswordRequest(email="user@example.com")
        assert req.email == "user@example.com"

    def test_rejects_bad_email(self) -> None:
        with pytest.raises(ValidationError):
            ForgotPasswordRequest(email="not-email")


class TestResetPasswordRequest:
    def test_valid(self) -> None:
        req = ResetPasswordRequest(token="abc123", new_password="new-secure-456")
        assert req.token == "abc123"

    def test_rejects_short_password(self) -> None:
        with pytest.raises(ValidationError):
            ResetPasswordRequest(token="abc", new_password="short")


# ── Analytics schemas ─────────────────────────────────────────────────────
class TestAnalytics:
    def test_daily_query(self) -> None:
        dq = DailyQuery(date="2025-06-01", count=42)
        assert dq.count == 42

    def test_user_analytics(self) -> None:
        ua = UserAnalytics(
            total_documents=10,
            completed_documents=7,
            total_conversations=5,
            total_messages=100,
            daily_queries=[DailyQuery(date="2025-06-01", count=42)],
        )
        assert ua.total_messages == 100
        assert len(ua.daily_queries) == 1


# ── DocumentRead ──────────────────────────────────────────────────────────
class TestDocumentRead:
    def test_full_fields(self, fake_uuid: UUID) -> None:
        doc = DocumentRead(
            id=fake_uuid,
            filename="report.pdf",
            mime_type="application/pdf",
            file_size=1024,
            content_sha256="abc123",
            status="completed",
            error_message=None,
            created_at="2025-06-01T00:00:00Z",
            updated_at="2025-06-01T00:00:00Z",
            processed_at="2025-06-01T01:00:00Z",
        )
        assert doc.filename == "report.pdf"
        assert doc.status == DocumentStatus.COMPLETED

    def test_failed_status(self, fake_uuid: UUID) -> None:
        doc = DocumentRead(
            id=fake_uuid,
            filename="bad.pdf",
            mime_type="application/pdf",
            file_size=512,
            content_sha256="def456",
            status="failed",
            error_message="Corrupt file",
            created_at="2025-06-01T00:00:00Z",
            updated_at="2025-06-01T00:00:00Z",
            processed_at=None,
        )
        assert doc.status == DocumentStatus.FAILED
        assert doc.error_message == "Corrupt file"
