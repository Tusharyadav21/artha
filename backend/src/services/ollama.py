import asyncio
import json
from collections.abc import AsyncIterator
from logging import getLogger

import httpx

from src.core.config import get_settings

logger = getLogger(__name__)


class OllamaClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = self.settings.ollama_base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create httpx client with connection pooling."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0),
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
        return self._client

    async def close(self) -> None:
        """Close the httpx client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _request_with_retry(
        self,
        method: str,
        endpoint: str,
        json_data: dict | None = None,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> httpx.Response:
        """Make HTTP request with exponential backoff retry."""
        client = await self._get_client()

        last_error: Exception | None = None
        for attempt in range(max_retries):
            try:
                response = await client.request(
                    method=method,
                    url=f"{self.base_url}{endpoint}",
                    json=json_data,
                )
                response.raise_for_status()
                return response
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                last_error = exc
                logger.warning(
                    f"Ollama request failed (attempt {attempt + 1}/{max_retries}): {exc}"
                )

                if attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    logger.info(f"Retrying in {delay}s...")
                    await asyncio.sleep(delay)

        raise last_error or httpx.RequestError("Unknown error")

    async def embed(self, text: str, model_name: str | None = None) -> list[float]:
        """Generate embedding with retry logic."""
        response = await self._request_with_retry(
            method="POST",
            endpoint="/api/embeddings",
            json_data={
                "model": model_name or self.settings.ollama_model_embed,
                "prompt": text,
            },
        )
        data = response.json()
        return list(data["embedding"])

    async def generate(
        self,
        prompt: str,
        model_name: str | None = None,
        num_ctx: int | None = None,
        num_predict: int | None = None,
        format: str | None = None,
    ) -> str:
        """Generate non-streaming LLM completion with retry logic."""
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
        """Stream LLM response with retry logic."""
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
                    f"Ollama streaming failed (attempt {attempt + 1}/3): {exc}"
                )

                if attempt < 2:
                    delay = 1.0 * (2**attempt)
                    logger.info(f"Retrying stream in {delay}s...")
                    await asyncio.sleep(delay)

        raise last_error or httpx.RequestError("Unknown streaming error")
