import asyncio
import hashlib
import json
import logging
from collections.abc import AsyncIterator

import httpx
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from src.core.config import get_settings
from src.core.redis_client import get_redis

logger = logging.getLogger(__name__)


def _is_retryable(exc: BaseException) -> bool:
    return isinstance(exc, httpx.RequestError | httpx.HTTPStatusError)


_ollama_lock: asyncio.Lock = asyncio.Lock()
_ollama_client: "OllamaClient | None" = None


async def get_ollama_client() -> "OllamaClient":
    global _ollama_client
    if _ollama_client is None:
        async with _ollama_lock:
            if _ollama_client is None:
                _ollama_client = OllamaClient()
    return _ollama_client


class OllamaClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = self.settings.ollama_base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None
        self._lock: asyncio.Lock = asyncio.Lock()

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0),
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    @staticmethod
    def _build_retry(max_retries: int, base_delay: float):
        return retry(
            retry=retry_if_exception(_is_retryable),
            stop=stop_after_attempt(max_retries),
            wait=wait_exponential(multiplier=base_delay, min=base_delay, max=30.0),
            before_sleep=before_sleep_log(logger, logging.WARNING),
            reraise=True,
        )

    async def _request(
        self, method: str, endpoint: str, json_data: dict | None = None
    ) -> httpx.Response:
        client = await self._get_client()
        response = await client.request(
            method=method,
            url=f"{self.base_url}{endpoint}",
            json=json_data,
        )
        response.raise_for_status()
        return response

    async def _request_with_retry(
        self,
        method: str,
        endpoint: str,
        json_data: dict | None = None,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> httpx.Response:
        decorated = self._build_retry(max_retries, base_delay)(self._request)
        return await decorated(method, endpoint, json_data=json_data)

    async def embed(self, text: str, model_name: str | None = None) -> list[float]:
        model = model_name or self.settings.ollama_model_embed
        cache_key = (
            f"embed:{model}:"
            f"{hashlib.sha256(text.encode('utf-8')).hexdigest()}"
        )
        ttl = self.settings.embed_cache_ttl_seconds

        if ttl > 0:
            try:
                redis = get_redis()
                cached = await redis.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception as exc:
                logger.warning("Embedding cache read failed: %s", exc)

        embedding = await self._compute_embedding(model, text)

        if ttl > 0:
            try:
                await get_redis().set(cache_key, json.dumps(embedding), ex=ttl, nx=True)
            except Exception as exc:
                logger.warning("Embedding cache write failed: %s", exc)

        return embedding

    async def _compute_embedding(self, model: str, text: str) -> list[float]:
        response = await self._request_with_retry(
            method="POST",
            endpoint="/api/embeddings",
            json_data={"model": model, "prompt": text},
        )
        return list(response.json()["embedding"])

    async def generate_with_images(
        self,
        prompt: str,
        images: list[str],
        model_name: str | None = None,
        num_ctx: int | None = None,
        num_predict: int | None = None,
    ) -> str:
        json_payload = {
            "model": model_name or self.settings.ollama_model_reasoner,
            "prompt": prompt,
            "images": images,
            "stream": False,
            "options": {
                "num_ctx": num_ctx or self.settings.ollama_num_ctx,
                "num_predict": num_predict or self.settings.ollama_num_predict,
            },
        }
        response = await self._request_with_retry(
            method="POST",
            endpoint="/api/generate",
            json_data=json_payload,
        )
        data = response.json()
        return data.get("response", "").strip()

    async def generate(
        self,
        prompt: str,
        model_name: str | None = None,
        num_ctx: int | None = None,
        num_predict: int | None = None,
        format: str | None = None,
    ) -> str:
        json_payload = {
            "model": model_name or self.settings.ollama_model_reasoner,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_ctx": num_ctx or self.settings.ollama_num_ctx,
                "num_predict": num_predict or self.settings.ollama_num_predict,
            },
        }
        if format:
            json_payload["format"] = format

        response = await self._request_with_retry(
            method="POST",
            endpoint="/api/generate",
            json_data=json_payload,
        )
        data = response.json()
        return data.get("response", "").strip()

    async def stream_generate(
        self,
        prompt: str,
        model_name: str | None = None,
        num_ctx: int | None = None,
        num_predict: int | None = None,
        format: str | None = None,
    ) -> AsyncIterator[str]:
        client = await self._get_client()

        json_payload = {
            "model": model_name or self.settings.ollama_model_reasoner,
            "prompt": prompt,
            "stream": True,
            "options": {
                "num_ctx": num_ctx or self.settings.ollama_num_ctx,
                "num_predict": num_predict or self.settings.ollama_num_predict,
            },
        }
        if format:
            json_payload["format"] = format

        last_error: Exception | None = None
        for attempt in range(3):
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/generate",
                    json=json_payload,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        payload = json.loads(line)
                        token = payload.get("response")
                        if token:
                            yield token
                        if payload.get("done"):
                            break
                return
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                last_error = exc
                logger.warning(
                    "Ollama streaming failed (attempt %d/3): %s", attempt + 1, exc
                )
                if attempt < 2:
                    delay = 1.0 * (2**attempt)
                    logger.info("Retrying stream in %ss...", delay)
                    await asyncio.sleep(delay)

        raise last_error or httpx.RequestError("Unknown streaming error")
