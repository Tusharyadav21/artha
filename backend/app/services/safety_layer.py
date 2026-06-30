import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

class SafetyViolationError(Exception):
    pass

class SafetyLayer:
    """Security and Governance checks for all incoming prompts and tool actions."""
    
    # Very basic regexes for demonstration. Production requires dedicated models (e.g. LlamaGuard).
    PROMPT_INJECTION_PATTERNS = [
        re.compile(r"ignore previous instructions", re.IGNORECASE),
        re.compile(r"system prompt", re.IGNORECASE),
        re.compile(r"you are now a", re.IGNORECASE)
    ]

    PII_PATTERNS = [
        re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), # SSN
        re.compile(r"\b(?:\d{4}-){3}\d{4}\b") # Credit Card
    ]

    def check_prompt(self, prompt: str) -> Tuple[bool, str]:
        """Validates incoming prompt for safety."""
        for pattern in self.PROMPT_INJECTION_PATTERNS:
            if pattern.search(prompt):
                logger.warning(f"Prompt injection attempt detected: {prompt}")
                return False, "Prompt injection detected"
                
        for pattern in self.PII_PATTERNS:
            if pattern.search(prompt):
                logger.warning(f"PII detected in prompt: {prompt}")
                return False, "PII detected"
                
        return True, "Safe"

    def authorize_tool_execution(self, user_role: str, tool_name: str) -> bool:
        """Verify if user has permission to execute a specific tool."""
        # Simple RBAC
        admin_tools = ["delete_workspace", "manage_billing"]
        if tool_name in admin_tools and user_role != "admin":
            return False
        return True

safety_layer = SafetyLayer()
