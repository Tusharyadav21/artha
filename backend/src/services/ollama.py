import asyncio
import hashlib
import json
from collections.abc import AsyncIterator
from logging import getLogger

import httpx

from src.core.config import get_settings
from src.core.redis_client import get_redis

logger = getLogger(__name__)


class OllamaClient:
    """
    Purpose:
        Async client for interacting with the local Ollama LLM and Embedding API.

    Responsibilities:
        - Manage HTTP connection pooling via httpx.
        - Implement exponential backoff retries for API calls.
        - Cache embeddings in Redis to reduce redundant compute.
        - Provide non-streaming and streaming generation interfaces.

    Dependencies:
        - httpx: For async HTTP requests.
        - Redis: For embedding cache.
        - Global settings: For base URL and model names.

    Architectural constraints:
        - All requests must use the configured timeout and retry logic.
        - Cache misses must not fail the overall request (graceful degradation).
    """
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = self.settings.ollama_base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """
        Purpose:
            Lazy initialization of the httpx.AsyncClient.

        Outputs:
            httpx.AsyncClient: The shared client instance.
        """
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0),
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
        return self._client

    async def close(self) -> None:
        """
        Purpose:
            Clean up the underlying HTTP client.

        Side effects:
            Closes the httpx.AsyncClient session.
        """
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
        """
        Purpose:
            Execute HTTP requests to Ollama with exponential backoff.

        Responsibilities:
            - Handle httpx request and status errors.
            - Implement retry logic with increasing delays.

        Inputs:
            method (str): HTTP method (GET, POST, etc.).
            endpoint (str): API endpoint path.
            json_data (dict | None): Request body.
            max_retries (int): Maximum number of retry attempts.
            base_delay (float): Initial delay between retries.

        Outputs:
            httpx.Response: The successful API response.

        Exceptions:
            httpx.RequestError | httpx.HTTPStatusError: Raised after all retries fail.

        Execution flow:
            1. Obtain the shared HTTP client.
            2. Loop up to max_retries.
            3. Attempt request and call raise_for_status().
            4. If successful, return response.
            5. If failed, log error and sleep for (base_delay * 2^attempt).
            6. Raise the last encountered error if all attempts fail.
        """
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
        """
        Purpose:
            Generate a high-dimensional embedding for the given text.

        Responsibilities:
            - Manage embedding cache in Redis to optimize latency.
            - Call the Ollama /api/embeddings endpoint.

        Inputs:
            text (str): Text to embed.
            model_name (str | None): Model override.

        Outputs:
            list[float]: The 768-dim embedding vector.

        Execution flow:
            1. Determine model and generate SHA256-based Redis cache key.
            2. Check Redis cache; return if hit.
            3. Execute request via _request_with_retry.
            4. Extract embedding from response JSON.
            5. Update Redis cache if TTL > 0.
            6. Return embedding.
        """
        model = model_name or self.settings.ollama_model_embed
        cache_key = (
            f"embed:{model}:"
            f"{hashlib.sha256(text.encode('utf-8')).hexdigest()}"
        )
        ttl = self.settings.embed_cache_ttl_seconds

        if ttl > 0:
            try:
                cached = await get_redis().get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception as exc:
                # Cache miss should never break a request — degrade gracefully.
                logger.warning(f"Embedding cache read failed: {exc}")

        response = await self._request_with_retry(
            method="POST",
            endpoint="/api/embeddings",
            json_data={"model": model, "prompt": text},
        )
        embedding = list(response.json()["embedding"])

        if ttl > 0:
            try:
                await get_redis().set(cache_key, json.dumps(embedding), ex=ttl)
            except Exception as exc:
                logger.warning(f"Embedding cache write failed: {exc}")

        return embedding

    async def generate(
        self,
        prompt: str,
        model_name: str | None = None,
        num_ctx: int | None = None,
        num_predict: int | None = None,
        format: str | None = None,
    ) -> str:
        """
        Purpose:
            Generate a single non-streaming completion from the LLM.

        Inputs:
            prompt (str): The prompt to send.
            model_name (str | None): Model override.
            num_ctx (int | None): Context window size override.
            num_predict (int | None): Max tokens override.
            format (str | None): Output format (e.g., "json").

        Outputs:
            str: The generated response text.

        Execution flow:
            1. Build JSON payload with model, prompt, and options.
            2. Execute request via _request_with_retry.
            3. Return the 'response' field from the JSON result.
        """
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
        """
        Purpose:
            Stream LLM response tokens as they are generated.

        Inputs:
            prompt (str): The prompt to send.
            model_name (str | None): Model override.
            num_ctx (int | None): Context window size override.
            num_predict (int | None): Max tokens override.
            format (str | None): Output format (e.g., "json").

        Outputs:
            AsyncIterator[str]: An async generator yielding tokens.

        Execution flow:
            1. Build JSON payload with stream: True.
            2. Use httpx.stream to connect to /api/generate.
            3. Iterate over response lines.
            4. Parse each line as JSON and yield the 'response' token.
            5. Exit when 'done' field is true or max retries are reached.
        """
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
