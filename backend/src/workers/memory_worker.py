import json
from logging import getLogger
from uuid import UUID

from sqlalchemy import select

from src.core.database import AsyncSessionLocal
from src.domain.models import Conversation, UserMemory
from src.services.ollama import OllamaClient

logger = getLogger(__name__)

async def extract_and_store_memory(conversation_id: str, user_id: str) -> None:
    """
    Background task to extract lasting facts, preferences, and corrections from a conversation.
    """
    db = None
    try:
        db = AsyncSessionLocal()
        
        # Fetch conversation messages
        result = await db.execute(
            select(Conversation).where(Conversation.id == UUID(conversation_id))
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation or not conversation.messages:
            return
            
        history_str = "\n".join([f"{m.role}: {m.content}" for m in conversation.messages[-6:]])
        
        prompt = (
            f"\n"
            f"        Analyze the following recent conversation history and extract any "
            f"lasting facts, user preferences, or explicit corrections the user made.\n"
            f"        Return ONLY a JSON array of strings, where each string is a concise "
            f"memory to retain for this user.\n"
            f"        If there is nothing worth remembering, return an empty array [].\n"
            f"\n"
            f"        Conversation:\n"
            f"        {history_str}\n"
            f"    "
        )
        
        ollama = OllamaClient()
        memories_json = await ollama.generate(prompt, format="json")
        
        if memories_json:
            try:
                memories_list = json.loads(memories_json)
                if isinstance(memories_list, list) and memories_list:
                    for mem in memories_list:
                        new_mem = UserMemory(
                            user_id=UUID(user_id),
                            content=str(mem)
                        )
                        db.add(new_mem)
                    await db.commit()
                    logger.info(f"Extracted {len(memories_list)} memories for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to parse memories JSON: {e}")
                
    except Exception as e:
        logger.error(f"Memory extraction failed: {e}")
    finally:
        if db:
            await db.close()
