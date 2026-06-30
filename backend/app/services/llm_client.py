"""Abstract LLM client interface and LiteLLM-backed implementation.

Design:
- BaseLLMClient defines generate() + stream_generate() + close().
- LiteLLMClient implements all three backed by the litellm library.
- SSRF guard validates custom api_base URLs (Ollama / OpenAI-compatible).
- Retries are delegated to LiteLLM's built-in retry logic.
"""

import hashlib
import ipaddress
import json
import logging
import socket
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from urllib.parse import urlparse

import litellm
from litellm import acompletion

from app.config import get_settings
from app.utils.redis_client import get_redis

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SSRF guard for custom base URLs (Ollama / OpenAI-compatible)
# ---------------------------------------------------------------------------

_PRIVATE_NETS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fd00::/8"),        # Unique Local Addresses (ULA)
    ipaddress.ip_network("fe80::/10"),        # Link-local addresses
    ipaddress.ip_network("100.64.0.0/10"),    # Carrier-grade NAT (RFC 6598)
]


def validate_base_url(url: str | None) -> str | None:
    """Raise ValueError if *url* resolves to a private/reserved IP address."""
    if not url:
        return None
    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("base_url must include a hostname")

    # Only https for remote; localhost/docker (Ollama) is exempt
    if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0", "ollama", "host.docker.internal", "artha-ollama-1"):
        return url.rstrip("/")
    if parsed.scheme != "https":
        raise ValueError(f"base_url must use https for remote hosts, got {parsed.scheme!r}")

    try:
        results = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise ValueError(f"base_url hostname could not be resolved: {exc}") from exc
    for *_, sockaddr in results:
        ip = ipaddress.ip_address(sockaddr[0])
        if any(ip in net for net in _PRIVATE_NETS):
            raise ValueError(f"base_url resolves to a private/reserved address: {ip}")
    return url.rstrip("/")


# Configure LiteLLM
litellm.suppress_debug_info = True
litellm.drop_params = True

# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------


class BaseLLMClient(ABC):
    @abstractmethod
    async def generate(self, prompt: str, *, model_name: str | None = None, **kwargs) -> str: ...

    @abstractmethod
    async def stream_generate(
        self, prompt: str, *, model_name: str | None = None, **kwargs
    ) -> AsyncIterator[str]: ...

    @abstractmethod
    async def close(self) -> None: ...

    @abstractmethod
    async def embed(self, text: str, *, model_name: str | None = None) -> list[float]: ...

    @abstractmethod
    async def generate_with_images(
        self, prompt: str, images: list[str], *, model_name: str | None = None, **kwargs
    ) -> str: ...


# ---------------------------------------------------------------------------
# LiteLLM-backed implementation
# ---------------------------------------------------------------------------


class LiteLLMClient(BaseLLMClient):
    """Single implementation for ALL providers via LiteLLM.

    Provider model strings follow the ``<provider>/<model>`` convention,
    e.g. ``openai/gpt-4o-mini``, ``anthropic/claude-3-5-haiku-latest``,
    ``ollama/qwen2.5:7b``, ``groq/llama-3.3-70b-versatile``.
    """

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        *,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        base_url: str | None = None,
        max_retries: int = 3,
        timeout_s: int = 60,
    ) -> None:
        self._model = model
        self._api_key = api_key
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._base_url = validate_base_url(base_url)
        self._max_retries = max_retries
        self._embed_ttl: int | None = None

        if timeout_s:
            litellm.request_timeout = timeout_s

    def _build_kwargs(self, stream: bool) -> dict:
        kwargs: dict = {
            "model": self._model,
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
            "stream": stream,
            "num_retries": self._max_retries,
        }
        if self._api_key:
            kwargs["api_key"] = self._api_key
        if self._base_url:
            kwargs["api_base"] = self._base_url
        return kwargs

    async def generate(self, prompt: str, *, model_name: str | None = None, **kwargs) -> str:
        model = model_name or self._model
        messages = [{"role": "user", "content": prompt}]

        call_kwargs = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.get("temperature", self._temperature),
            "max_tokens": kwargs.get("max_tokens", self._max_tokens),
            "num_retries": self._max_retries,
        }
        if self._api_key:
            call_kwargs["api_key"] = self._api_key
        if self._base_url:
            call_kwargs["api_base"] = self._base_url

        if kwargs.get("format") == "json":
            call_kwargs["response_format"] = {"type": "json_object"}

        try:
            response = await acompletion(**call_kwargs)
        except Exception as exc:
            logger.error("LiteLLM generate failed (model=%s): %s", model, exc)
            raise

        content = response.choices[0].message.content
        return (content or "").strip()

    async def stream_generate(
        self, prompt: str, *, model_name: str | None = None, **kwargs
    ) -> AsyncIterator[str]:
        model = model_name or self._model
        messages = [{"role": "user", "content": prompt}]

        call_kwargs: dict = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.get("temperature", self._temperature),
            "max_tokens": kwargs.get("max_tokens", self._max_tokens),
            "stream": True,
            "num_retries": self._max_retries,
        }
        if self._api_key:
            call_kwargs["api_key"] = self._api_key
        if self._base_url:
            call_kwargs["api_base"] = self._base_url

        if kwargs.get("format") == "json":
            call_kwargs["response_format"] = {"type": "json_object"}

        try:
            response = await acompletion(**call_kwargs)
            async for chunk in response:
                if content := chunk.choices[0].delta.content:
                    yield content
        except Exception as exc:
            logger.error("LiteLLM stream failed (model=%s): %s", model, exc)
            raise

    async def close(self) -> None:
        pass  # LiteLLM manages its own HTTP client lifecycle

    async def _compute_embedding(self, model: str, text: str) -> list[float]:
        """Call LiteLLM aembedding and return the embedding vector."""
        response = await litellm.aembedding(model=model, input=text)
        return response.data[0]["embedding"]

    async def embed(self, text: str, *, model_name: str | None = None) -> list[float]:
        model = model_name or self._model
        cache_key = f"embed:{model}:{hashlib.sha256(text.encode('utf-8')).hexdigest()}"

        # Lazy-load embed TTL from settings on first call
        if self._embed_ttl is None:
            self._embed_ttl = get_settings().embed_cache_ttl_seconds

        # Read from cache
        if self._embed_ttl and self._embed_ttl > 0:
            try:
                cached = await get_redis().get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception as exc:
                logger.warning("Embedding cache read failed: %s", exc)

        # Compute embedding
        try:
            embedding = await self._compute_embedding(model, text)
        except Exception as exc:
            logger.error("LiteLLM embed failed (model=%s): %s", model, exc)
            raise

        # Write to cache
        if self._embed_ttl and self._embed_ttl > 0:
            try:
                await get_redis().set(cache_key, json.dumps(embedding), ex=self._embed_ttl, nx=True)
            except Exception as exc:
                logger.warning("Embedding cache write failed: %s", exc)

        return embedding

    async def generate_with_images(
        self, prompt: str, images: list[str], *, model_name: str | None = None, **kwargs
    ) -> str:
        model = model_name or self._model
        content = [{"type": "text", "text": prompt}]
        for img in images:
            content.append({"type": "image_url", "image_url": {"url": img}})

        call_kwargs = {
            "model": model,
            "messages": [{"role": "user", "content": content}],
            "temperature": kwargs.get("temperature", self._temperature),
            "max_tokens": kwargs.get("max_tokens", self._max_tokens),
            "num_retries": self._max_retries,
        }
        if self._api_key:
            call_kwargs["api_key"] = self._api_key
        if self._base_url:
            call_kwargs["api_base"] = self._base_url

        try:
            response = await acompletion(**call_kwargs)
        except Exception as exc:
            logger.error("LiteLLM generate_with_images failed (model=%s): %s", model, exc)
            raise

        content = response.choices[0].message.content
        return (content or "").strip()


# ---------------------------------------------------------------------------
# Legacy aliases — keep existing imports working during migration
# ---------------------------------------------------------------------------

OllamaAdapter = LiteLLMClient
