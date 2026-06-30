import os
from typing import Any, Dict

import yaml
from pydantic import BaseModel

class ModelConfig(BaseModel):
    provider: str
    model_name: str
    temperature: float
    description: str

class ModelRegistry:
    def __init__(self, config_path: str = "app/config/models.yaml"):
        self.config_path = config_path
        self._models: Dict[str, ModelConfig] = {}
        self._load_config()

    def _load_config(self):
        if not os.path.exists(self.config_path):
            print(f"Warning: Model config {self.config_path} not found.")
            return
            
        with open(self.config_path, 'r') as f:
            data = yaml.safe_load(f) or {}
            
        for key, val in data.get("models", {}).items():
            self._models[key] = ModelConfig(**val)

    def get_model(self, task_type: str) -> ModelConfig | None:
        """Fetch the optimal model for a given task type (e.g. 'planner', 'coding')."""
        return self._models.get(task_type)

model_registry = ModelRegistry()
