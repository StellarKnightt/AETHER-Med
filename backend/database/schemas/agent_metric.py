from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class AgentMetricResponse(BaseModel):
    id: UUID
    agent_id: str
    patients_analyzed: int
    actions_executed: int
    last_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentRunHistoryCreate(BaseModel):
    patients_analyzed: int
    recommendations_generated: int
    approvals: int
    rejections: int
    actions_executed: int
    execution_duration_ms: float


class AgentRunHistoryResponse(AgentRunHistoryCreate):
    id: UUID
    agent_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
