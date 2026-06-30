import json
from typing import List
from langchain_ollama import ChatOllama
from app.config import get_settings
from app.services.model_registry import model_registry
from app.services.prompt_manager import prompt_manager

settings = get_settings()

class PlannerService:
    """Generates structured execution plans."""
    
    def generate_plan(self, query: str, context: str = "") -> List[str]:
        model_config = model_registry.get_model("planner")
        if not model_config:
            return [query] # fallback to single step
            
        llm = ChatOllama(
            model=model_config.model_name,
            base_url=settings.ollama_base_url,
            temperature=model_config.temperature
        )
        
        sys_prompt = prompt_manager.get_prompt("planner")
        
        full_prompt = f"{sys_prompt}\n\nContext: {context}\n\nQuery: {query}"
        
        response = llm.invoke(full_prompt)
        
        try:
            # Attempt to parse strict JSON array
            plan = json.loads(response.content)
            if isinstance(plan, list):
                return plan
            return [str(plan)]
        except json.JSONDecodeError:
            # Fallback to splitting by newlines if LLM fails to output valid JSON
            lines = response.content.split('\n')
            clean_lines = [l.strip().lstrip('1234567890.- ') for l in lines if l.strip()]
            return clean_lines

planner_service = PlannerService()
