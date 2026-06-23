"""
Prompt Manager
==============
Manages loading and versioning of system and agent prompts.
"""

from typing import Dict, Any, Optional
from langchain.prompts import ChatPromptTemplate

class PromptManager:
    """Handles dynamic prompt loading and templating."""
    
    def __init__(self):
        self.prompts: Dict[str, str] = {
            "system_base": "You are an AI assistant in the AETHER-Med ecosystem. Follow all medical safety protocols.",
            "triage_v1": "Analyze the following patient vitals and history: {vitals}. Return a triage level (1-5).",
        }

    def get_prompt_template(self, prompt_id: str) -> ChatPromptTemplate:
        """Get a LangChain ChatPromptTemplate by ID."""
        template_str = self.prompts.get(prompt_id, self.prompts["system_base"])
        return ChatPromptTemplate.from_messages([
            ("system", self.prompts["system_base"]),
            ("user", template_str)
        ])

    def register_prompt(self, prompt_id: str, content: str):
        """Manually register a new prompt template."""
        self.prompts[prompt_id] = content
