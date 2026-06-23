"""
Pharma Configuration
====================
Configuration schemas for the Pharma Agent.
"""
from pydantic import BaseModel, Field

class PharmaConfig(BaseModel):
    """Configuration for Pharma Agent."""
    llm_model: str = Field(default="llama-3.3-70b-versatile")
    temperature: float = Field(default=0.1)
    max_tokens: int = Field(default=1024)
