import asyncio

from app.services.llm_client import LiteLLMClient


async def main():
    try:
        client = LiteLLMClient(model="gemma4:e4b", base_url="http://localhost:11434")
        res = await client.generate(
            "test prompt",
            model_name="gemma4:e4b"
        )
        print("Success generation!", res[:20])
    except Exception as e:
        print("Exception:", type(e))
        print("Detail:", str(e))

asyncio.run(main())
