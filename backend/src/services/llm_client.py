"""
Abstract LLM client interface and per-provider implementations.

Design:
- BaseLLMClient defines generate() + stream_generate(); embed() stays on OllamaClient
  because embeddings must match the indexed vector dimensions.
- OpenAICompatibleClient covers OpenAI, Groq, Mistral, Together AI (same REST shape).
- AnthropicClient, GeminiClient, CohereClient cover their respective proprietary formats.
- OllamaAdapter wraps the existing OllamaClient so it satisfies BaseLLMClient.
- Retry strategy: tenacity exponential-jitter on non-streaming calls;
  manual exponential backoff on streaming (tenacity cannot wrap async generators).
- Non-retryable: 4xx status codes except 429 (rate-limit).
"""

import asyncio
import ipaddress
import json
import logging
import socket
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from urllib.parse import urlparse

import httpx
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# SSRF guard
# ---------------------------------------------------------------------------

_PRIVATE_NETS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),  # link-local
    ipaddress.ip_network("fc00::/7"),         # ULA
    ipaddress.ip_network("100.64.0.0/10"),   # shared address space
]


def _validate_base_url(url: str) -> str:
    """Reject non-https and private/loopback hosts to prevent SSRF."""
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"base_url must use https scheme, got {parsed.scheme!r}")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("base_url must include a hostname")
    try:
        results = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise ValueError(f"base_url hostname could not be resolved: {exc}") from exc
    for *_, sockaddr in results:
        ip = ipaddress.ip_address(sockaddr[0])
        if any(ip in net for net in _PRIVATE_NETS):
            raise ValueError(f"base_url resolves to a private/reserved address: {ip}")
    return url.rstrip("/")


# ---------------------------------------------------------------------------
# Retry helpers
# ---------------------------------------------------------------------------

def _is_retryable(exc: BaseException) -> bool:
    """Rate-limits, timeouts, and 5xx are retryable; auth/validation errors are not."""
    if isinstance(exc, httpx.TimeoutException | httpx.ConnectError):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        return code == 429 or code >= 500
    return False


def _build_retry(max_retries: int, base_delay: float):
    return retry(
        retry=retry_if_exception(_is_retryable),
        stop=stop_after_attempt(max_retries),
        wait=wait_exponential_jitter(initial=base_delay, max=30.0),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )


async def _stream_retry_sleep(attempt: int, base_delay: float, exc: Exception) -> None:
    delay = base_delay * (2 ** attempt)
    logger.warning("Stream attempt %d failed (%s), retrying in %.1fs", attempt + 1, exc, delay)
    await asyncio.sleep(delay)


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class BaseLLMClient(ABC):
    """Minimal interface every provider client must satisfy."""

    @abstractmethod
    async def generate(self, prompt: str, *, model_name: str | None = None, **kwargs) -> str: ...

    @abstractmethod
    async def stream_generate(
        self, prompt: str, *, model_name: str | None = None, **kwargs
    ) -> AsyncIterator[str]: ...

    async def close(self) -> None:
        pass


# ---------------------------------------------------------------------------
# OpenAI-compatible (OpenAI · Groq · Mistral · Together AI)
# ---------------------------------------------------------------------------

class OpenAICompatibleClient(BaseLLMClient):
    """Single implementation for all OpenAI-compatible chat/completions endpoints."""

    _BASE_URLS: dict[str, str] = {
        "openai": "https://api.openai.com/v1",
        "groq": "https://api.groq.com/openai/v1",
        "mistral": "https://api.mistral.ai/v1",
        "together": "https://api.together.xyz/v1",
    }
    _DEFAULT_MODELS: dict[str, str] = {
        "openai": "gpt-4o-mini",
        "groq": "llama-3.3-70b-versatile",
        "mistral": "mistral-small-latest",
        "together": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    }

    def __init__(
        self,
        provider: str,
        api_key: str,
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        max_retries: int = 3,
        base_delay_s: float = 1.0,
        timeout_s: int = 60,
        extra_params: dict | None = None,
    ) -> None:
        extra = extra_params or {}
        self._provider = provider
        self._model = model or self._DEFAULT_MODELS.get(provider, "gpt-4o-mini")
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._timeout_s = timeout_s
        self._max_retries = max_retries
        self._base_delay_s = base_delay_s
        raw_url = extra.get("base_url") or self._BASE_URLS.get(provider, "")
        self._base_url = _validate_base_url(raw_url) if raw_url else ""
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                headers=self._headers,
                timeout=httpx.Timeout(
                    connect=10.0, read=float(self._timeout_s), write=10.0, pool=5.0
                ),
                follow_redirects=False,
            )
        return self._client

    def _body(self, prompt: str, model: str, stream: bool) -> dict:
        return {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
            "stream": stream,
        }

    async def generate(self, prompt: str, *, model_name: str | None = None, **kwargs) -> str:
        model = model_name or self._model

        @_build_retry(self._max_retries, self._base_delay_s)
        async def _call() -> str:
            resp = await self._get_client().post("/chat/completions", json=self._body(prompt, model, False))
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()

        return await _call()

    async def stream_generate(
        self, prompt: str, *, model_name: str | None = None, **kwargs
    ) -> AsyncIterator[str]:
        model = model_name or self._model
        last_error: Exception | None = None
        for attempt in range(self._max_retries):
            try:
                async with self._get_client().stream(
                    "POST", "/chat/completions", json=self._body(prompt, model, True)
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw = line[6:]
                        if raw == "[DONE]":
                            break
                        try:
                            token = json.loads(raw)["choices"][0]["delta"].get("content", "")
                            if token:
                                yield token
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                return
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                last_error = exc
                if not _is_retryable(exc) or attempt >= self._max_retries - 1:
                    raise
                await _stream_retry_sleep(attempt, self._base_delay_s, exc)
        raise last_error or httpx.RequestError("Unknown streaming error")

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None


# ---------------------------------------------------------------------------
# Anthropic
# ---------------------------------------------------------------------------

class AnthropicClient(BaseLLMClient):
    """Anthropic Claude via the Messages API."""

    _DEFAULT_MODEL = "claude-3-5-haiku-latest"

    def __init__(
        self,
        api_key: str,
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        max_retries: int = 3,
        base_delay_s: float = 1.0,
        timeout_s: int = 60,
        **_,
    ) -> None:
        self._model = model or self._DEFAULT_MODEL
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._timeout_s = timeout_s
        self._max_retries = max_retries
        self._base_delay_s = base_delay_s
        self._headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url="https://api.anthropic.com/v1",
                headers=self._headers,
                timeout=httpx.Timeout(
                    connect=10.0, read=float(self._timeout_s), write=10.0, pool=5.0
                ),
                follow_redirects=False,
            )
        return self._client

    def _body(self, prompt: str, model: str, stream: bool) -> dict:
        return {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
            "stream": stream,
        }

    async def generate(self, prompt: str, *, model_name: str | None = None, **kwargs) -> str:
        model = model_name or self._model

        @_build_retry(self._max_retries, self._base_delay_s)
        async def _call() -> str:
            resp = await self._get_client().post("/messages", json=self._body(prompt, model, False))
            resp.raise_for_status()
            return resp.json()["content"][0]["text"].strip()

        return await _call()

    async def stream_generate(
        self, prompt: str, *, model_name: str | None = None, **kwargs
    ) -> AsyncIterator[str]:
        model = model_name or self._model
        last_error: Exception | None = None
        for attempt in range(self._max_retries):
            try:
                async with self._get_client().stream(
                    "POST", "/messages", json=self._body(prompt, model, True)
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        try:
                            data = json.loads(line[6:])
                            if data.get("type") == "content_block_delta":
                                token = data["delta"].get("text", "")
                                if token:
                                    yield token
                        except (json.JSONDecodeError, KeyError):
                            continue
                return
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                last_error = exc
                if not _is_retryable(exc) or attempt >= self._max_retries - 1:
                    raise
                await _stream_retry_sleep(attempt, self._base_delay_s, exc)
        raise last_error or httpx.RequestError("Unknown streaming error")

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None


# ---------------------------------------------------------------------------
# Google Gemini
# ---------------------------------------------------------------------------

class GeminiClient(BaseLLMClient):
    """Google Gemini via the Generative Language REST API."""

    _DEFAULT_MODEL = "gemini-2.0-flash"
    _BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(
        self,
        api_key: str,
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        max_retries: int = 3,
        base_delay_s: float = 1.0,
        timeout_s: int = 60,
        **_,
    ) -> None:
        self._api_key = api_key
        self._model = model or self._DEFAULT_MODEL
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._timeout_s = timeout_s
        self._max_retries = max_retries
        self._base_delay_s = base_delay_s
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._BASE_URL,
                timeout=httpx.Timeout(
                    connect=10.0, read=float(self._timeout_s), write=10.0, pool=5.0
                ),
                follow_redirects=False,
            )
        return self._client

    def _body(self, prompt: str) -> dict:
        return {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": self._temperature,
                "maxOutputTokens": self._max_tokens,
            },
        }

    async def generate(self, prompt: str, *, model_name: str | None = None, **kwargs) -> str:
        model = model_name or self._model

        @_build_retry(self._max_retries, self._base_delay_s)
        async def _call() -> str:
            resp = await self._get_client().post(
                f"/models/{model}:generateContent",
                params={"key": self._api_key},
                json=self._body(prompt),
            )
            resp.raise_for_status()
            return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

        return await _call()

    async def stream_generate(
        self, prompt: str, *, model_name: str | None = None, **kwargs
    ) -> AsyncIterator[str]:
        model = model_name or self._model
        last_error: Exception | None = None
        for attempt in range(self._max_retries):
            try:
                async with self._get_client().stream(
                    "POST",
                    f"/models/{model}:streamGenerateContent",
                    params={"key": self._api_key, "alt": "sse"},
                    json=self._body(prompt),
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        try:
                            data = json.loads(line[6:])
                            token = data["candidates"][0]["content"]["parts"][0]["text"]
                            if token:
                                yield token
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                return
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                last_error = exc
                if not _is_retryable(exc) or attempt >= self._max_retries - 1:
                    raise
                await _stream_retry_sleep(attempt, self._base_delay_s, exc)
        raise last_error or httpx.RequestError("Unknown streaming error")

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None


# ---------------------------------------------------------------------------
# Cohere
# ---------------------------------------------------------------------------

class CohereClient(BaseLLMClient):
    """Cohere Command via Chat API v2."""

    _DEFAULT_MODEL = "command-r-plus-08-2024"

    def __init__(
        self,
        api_key: str,
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        max_retries: int = 3,
        base_delay_s: float = 1.0,
        timeout_s: int = 60,
        **_,
    ) -> None:
        self._model = model or self._DEFAULT_MODEL
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._timeout_s = timeout_s
        self._max_retries = max_retries
        self._base_delay_s = base_delay_s
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url="https://api.cohere.com/v2",
                headers=self._headers,
                timeout=httpx.Timeout(
                    connect=10.0, read=float(self._timeout_s), write=10.0, pool=5.0
                ),
                follow_redirects=False,
            )
        return self._client

    def _body(self, prompt: str, model: str, stream: bool) -> dict:
        return {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
            "stream": stream,
        }

    async def generate(self, prompt: str, *, model_name: str | None = None, **kwargs) -> str:
        model = model_name or self._model

        @_build_retry(self._max_retries, self._base_delay_s)
        async def _call() -> str:
            resp = await self._get_client().post("/chat", json=self._body(prompt, model, False))
            resp.raise_for_status()
            return resp.json()["message"]["content"][0]["text"].strip()

        return await _call()

    async def stream_generate(
        self, prompt: str, *, model_name: str | None = None, **kwargs
    ) -> AsyncIterator[str]:
        model = model_name or self._model
        last_error: Exception | None = None
        for attempt in range(self._max_retries):
            try:
                async with self._get_client().stream(
                    "POST", "/chat", json=self._body(prompt, model, True)
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            if data.get("type") == "content-delta":
                                token = data["delta"]["message"]["content"]["text"]
                                if token:
                                    yield token
                        except (json.JSONDecodeError, KeyError):
                            continue
                return
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                last_error = exc
                if not _is_retryable(exc) or attempt >= self._max_retries - 1:
                    raise
                await _stream_retry_sleep(attempt, self._base_delay_s, exc)
        raise last_error or httpx.RequestError("Unknown streaming error")

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None


# ---------------------------------------------------------------------------
# Ollama adapter (wraps existing OllamaClient)
# ---------------------------------------------------------------------------

class OllamaAdapter(BaseLLMClient):
    """Thin adapter so OllamaClient satisfies BaseLLMClient without modification."""

    def __init__(self, model: str | None = None) -> None:
        # Lazy import to avoid circular dependency during module load
        from src.services.ollama import OllamaClient  # noqa: PLC0415
        self._inner = OllamaClient()
        self._model = model

    async def generate(self, prompt: str, *, model_name: str | None = None, **kwargs) -> str:
        return await self._inner.generate(prompt, model_name=model_name or self._model, **kwargs)

    async def stream_generate(
        self, prompt: str, *, model_name: str | None = None, **kwargs
    ) -> AsyncIterator[str]:
        async for token in self._inner.stream_generate(
            prompt, model_name=model_name or self._model, **kwargs
        ):
            yield token

    async def close(self) -> None:
        await self._inner.close()
