import json
from typing import Any, Dict

from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage
from app.config import get_settings
from app.services.model_registry import model_registry
from app.services.prompt_manager import prompt_manager

settings = get_settings()

class IntentClassifier:
    """Classifies user intent to route to the correct workflow."""
    
    INTENT_CATEGORIES = [
        "chat",
        "rag",
        "tool_invocation",
        "coding",
        "multi_step_workflow",
        "research",
        "document_qa",
        "image_generation"
    ]

    def classify(self, query: str) -> str:
        """
        Uses a fast/cheap LLM to categorize the intent.
        Returns one of INTENT_CATEGORIES.
        """
        # Get cheap model
        model_config = model_registry.get_model("cheap_tasks")
        if not model_config:
            # Fallback heuristic
            if "search" in query.lower() or "find" in query.lower():
                return "research"
            return "chat"
            
        llm = ChatOllama(
            model=model_config.model_name,
            base_url=settings.ollama_base_url,
            temperature=0.1
        )
        
        prompt = f"""
        Classify the following query into exactly one of these categories:
        {json.dumps(self.INTENT_CATEGORIES)}
        
        Query: {query}
        
        Output only the raw category string.
        """
        
        response = llm.invoke([HumanMessage(content=prompt)])
        category = response.content.strip().lower()
        
        if category in self.INTENT_CATEGORIES:
            return category
            
        # Default fallback for complex things
        return "multi_step_workflow"

intent_classifier = IntentClassifier()
