import asyncio

from app.services.llm_client import LiteLLMClient


async def main():
    try:
        client = LiteLLMClient(model="ollama/qwen2.5:7b", base_url="http://localhost:11434")
        async for chunk in client.stream_generate("hi"):
            print(chunk, end="", flush=True)
        print("\nSuccess stream!")
    except Exception as e:
        print("Exception:", type(e))
        print("Detail:", str(e))

asyncio.run(main())
