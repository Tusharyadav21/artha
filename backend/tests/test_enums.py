"""Tests for application enums."""
from app.models.enums import (
    ChatScopeMode,
    DocumentStatus,
    HomeTab,
    LLMProvider,
    MessageRole,
    ThemePreference,
    ToolAuthType,
)


class TestMessageRole:
    def test_values(self) -> None:
        assert MessageRole.USER == "user"
        assert MessageRole.ASSISTANT == "assistant"
        assert MessageRole.SYSTEM == "system"


class TestDocumentStatus:
    def test_values(self) -> None:
        assert DocumentStatus.PENDING == "pending"
        assert DocumentStatus.PROCESSING == "processing"
        assert DocumentStatus.COMPLETED == "completed"
        assert DocumentStatus.FAILED == "failed"


class TestThemePreference:
    def test_values(self) -> None:
        assert ThemePreference.SYSTEM == "system"
        assert ThemePreference.LIGHT == "light"
        assert ThemePreference.DARK == "dark"


class TestHomeTab:
    def test_values(self) -> None:
        assert HomeTab.CHAT == "chat"
        assert HomeTab.LIBRARY == "library"
        assert HomeTab.SETTINGS == "settings"


class TestChatScopeMode:
    def test_values(self) -> None:
        assert ChatScopeMode.CLEAR == "clear"
        assert ChatScopeMode.REMEMBER == "remember"
        assert ChatScopeMode.ALL_COMPLETED == "all-completed"


class TestLLMProvider:
    def test_values(self) -> None:
        assert LLMProvider.OLLAMA == "ollama"
        assert LLMProvider.OPENAI == "openai"
        assert LLMProvider.ANTHROPIC == "anthropic"
        assert LLMProvider.GROQ == "groq"
        assert LLMProvider.GEMINI == "gemini"
        assert LLMProvider.MISTRAL == "mistral"
        assert LLMProvider.TOGETHER == "together"
        assert LLMProvider.COHERE == "cohere"


class TestToolAuthType:
    def test_values(self) -> None:
        assert ToolAuthType.NONE == "none"
        assert ToolAuthType.API_KEY == "api_key"
        assert ToolAuthType.MCP == "mcp"


class TestEnumUsage:
    """Verify enums work in real scenarios (membership, construction)."""

    def test_from_string(self) -> None:
        assert MessageRole("user") == MessageRole.USER

    def test_invalid_string_raises(self) -> None:
        import pytest
        with pytest.raises(ValueError):
            MessageRole("bot")

    def test_str_membership(self) -> None:
        assert "user" in set(m.value for m in MessageRole)
        assert "admin" not in set(m.value for m in MessageRole)
