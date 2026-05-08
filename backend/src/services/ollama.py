import json
from collections.abc import AsyncIterator

import httpx

from src.core.config import get_settings


class OllamaClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = self.settings.ollama_base_url.rstrip("/")

    async def embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.settings.ollama_model_embed, "prompt": text},
            )
            response.raise_for_status()
            data = response.json()
            return list(data["embedding"])

    async def stream_generate(self, prompt: str) -> AsyncIterator[str]:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json={
                    "model": self.settings.ollama_model_reasoner,
                    "prompt": prompt,
                    "stream": True,
                    "options": {
                        "num_ctx": self.settings.ollama_num_ctx,
                        "num_predict": self.settings.ollama_num_predict,
                    },
                },
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
