"""
Communication Schemas
=====================
Pydantic models for internal messaging between agents.
"""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from uuid import uuid4

class AgentMessage(BaseModel):
    """Base schema for messages sent between agents."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    sender: str
    receiver: str
    message_type: str
    content: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    correlation_id: Optional[str] = None

class AgentEvent(BaseModel):
    """Base schema for system-wide events emitted by agents."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    sender: str
    event_type: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    severity: str = "info"
