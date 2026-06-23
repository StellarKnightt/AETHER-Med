"""
Agent Log Pydantic Schemas
===========================
Request/response schemas for the Agent Logs API.
"""

import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class AgentLogCreate(BaseModel):
    """Schema for creating an agent log entry."""
    agent_name: str = Field(..., max_length=100, examples=["triage_agent"])
    action: str = Field(..., max_length=255, examples=["process_patient"])
    input_data: dict[str, Any] | None = None
    output_data: dict[str, Any] | None = None
    status: str = Field(default="completed", max_length=50)
    error_message: str | None = None


class AgentLogResponse(BaseModel):
    """Schema for agent log API responses."""
    id: uuid.UUID
    agent_name: str
    action: str
    input_data: dict[str, Any] | None
    output_data: dict[str, Any] | None
    status: str
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
