import os
from typing import Dict

import yaml
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate

class PromptManager:
    """Loads and manages prompt templates from configurations."""
    
    def __init__(self, config_path: str = "app/config/prompts.yaml"):
        self.config_path = config_path
        self._prompts: Dict[str, str] = {}
        self._load_config()

    def _load_config(self):
        if not os.path.exists(self.config_path):
            print(f"Warning: Prompt config {self.config_path} not found.")
            return
            
        with open(self.config_path, 'r') as f:
            data = yaml.safe_load(f) or {}
            
        for key, val in data.get("prompts", {}).items():
            self._prompts[key] = val

    def get_prompt(self, name: str) -> str:
        """Returns the raw prompt string."""
        return self._prompts.get(name, "")

    def get_chat_prompt(self, name: str) -> ChatPromptTemplate:
        """Returns a Langchain ChatPromptTemplate."""
        raw_prompt = self.get_prompt(name)
        return ChatPromptTemplate.from_messages([
            ("system", raw_prompt),
            ("placeholder", "{messages}")
        ])

prompt_manager = PromptManager()
