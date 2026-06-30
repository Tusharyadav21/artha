import asyncio

import litellm


async def main():
    try:
        res = await litellm.aembedding(
            model="ollama/bge-m3:latest",
            input="test string",
            api_base="http://localhost:11434"
        )
        print("Success!", res.data[0]["embedding"][:5])
    except Exception as e:
        print("Exception:", type(e))
        print("Detail:", str(e))

asyncio.run(main())
