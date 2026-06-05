import json
from logging import getLogger
from typing import Dict, Any

from src.services.ollama import OllamaClient

logger = getLogger(__name__)

async def extract_graph_from_text(text: str) -> Dict[str, Any]:
    """
    Extracts entities and relationships from the text using the LLM.
    """
    ollama = OllamaClient()
    
    prompt = f"""
    You are an expert Knowledge Graph extractor. Given the text below, extract:
    1. A list of entities (nodes). Each entity must have a 'name', 'type' (e.g. PERSON, ORGANIZATION, CONCEPT, LOCATION), and a brief 'description'.
    2. A list of relationships (edges) between these entities. Each relationship must have a 'source' (name of an entity), 'target' (name of an entity), 'type' (a short uppercase relationship string, e.g., WORKS_FOR, LOCATED_IN), and a brief 'description'.
    
    Return ONLY a valid JSON object with the keys "entities" and "relations".
    
    Text:
    {text}
    """
    
    try:
        response_json = await ollama.generate(prompt, format="json", num_predict=1024)
        if response_json:
            return json.loads(response_json)
    except Exception as e:
        logger.error(f"Graph extraction failed: {e}")
        
    return {"entities": [], "relations": []}
