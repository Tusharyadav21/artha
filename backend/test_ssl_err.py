import asyncio

import litellm


async def test():
    try:
        await litellm.acompletion(
            model="ollama/qwen2.5:7b", 
            messages=[{"role": "user", "content": "hi"}],
            api_base="https://localhost:11434"
        )
    except Exception as e:
        print(repr(e))

asyncio.run(test())
