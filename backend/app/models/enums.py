from __future__ import annotations

from enum import StrEnum


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class DocumentStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ThemePreference(StrEnum):
    SYSTEM = "system"
    LIGHT = "light"
    DARK = "dark"


class HomeTab(StrEnum):
    CHAT = "chat"
    LIBRARY = "library"
    SETTINGS = "settings"


class ChatScopeMode(StrEnum):
    CLEAR = "clear"
    REMEMBER = "remember"
    ALL_COMPLETED = "all-completed"


class LLMProvider(StrEnum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROQ = "groq"
    GEMINI = "gemini"
    MISTRAL = "mistral"
    TOGETHER = "together"
    COHERE = "cohere"
    OLLAMA = "ollama"


class ToolAuthType(StrEnum):
    NONE = "none"
    API_KEY = "api_key"
    MCP = "mcp"
