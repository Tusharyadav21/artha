import asyncio

import litellm


async def main():
    try:
        res = await litellm.aembedding(
            model="ollama/qwen2.5:7b",
            input="test string",
            api_base="http://localhost:11434"
        )
        print("Success!", len(res.data[0]["embedding"]))
    except Exception as e:
        print("Exception:", type(e))
        print("Detail:", str(e))

asyncio.run(main())
