"""
Scheduler Configuration
=======================
Configuration schemas for the Scheduler Agent.
"""
from pydantic import BaseModel, Field

class SchedulerConfig(BaseModel):
    """Configuration for Scheduler Agent."""
    llm_model: str = Field(default="llama-3.3-70b-versatile")
    temperature: float = Field(default=0.1)
    max_tokens: int = Field(default=1024)
