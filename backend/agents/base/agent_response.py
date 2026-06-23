"""
Agent Response
==============
Standardized Pydantic models for all agent outputs.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from backend.agents.shared.validators import validate_confidence_score

class AgentResponse(BaseModel):
    """Standardized response from an agent."""
    agent_name: str
    decision: str
    confidence: float
    reasoning: List[str] = []
    evidence: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Metadata
    execution_time: float = 0.0
    provider_used: Optional[str] = None
    model_used: Optional[str] = None
    tokens_used: Dict[str, int] = Field(default_factory=lambda: {"total": 0})
    
    # Error Handling
    warnings: List[str] = []
    errors: List[str] = []
    
    @field_validator("confidence")
    @classmethod
    def check_confidence(cls, v: float) -> float:
        return validate_confidence_score(v)
