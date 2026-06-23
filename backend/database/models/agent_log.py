"""
Agent Log Model
================
Tracks all agent actions for auditing, debugging, and analysis.
"""

from sqlalchemy import String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base


class AgentLog(Base):
    """Log entry for an agent action."""

    __tablename__ = "agent_logs"

    agent_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    input_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    output_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="completed"
    )
    # TODO: Phase 2+ fields
    # - workflow_id: UUID (FK to workflows)
    # - patient_id: UUID (FK to patients)
    # - execution_time_ms: Float
    # - error_trace: Text
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<AgentLog(agent='{self.agent_name}', action='{self.action}', status='{self.status}')>"
