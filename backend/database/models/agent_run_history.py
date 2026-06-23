"""
Agent Run History Model
=======================
Stores the historical record of each execution batch.
"""

from sqlalchemy import Integer, String, Float
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base

class AgentRunHistory(Base):
    """Historical record of an agent execution batch."""

    __tablename__ = "agent_run_history"

    agent_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    patients_analyzed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recommendations_generated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    approvals: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rejections: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    actions_executed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    execution_duration_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    def __repr__(self) -> str:
        return f"<AgentRunHistory(agent_id='{self.agent_id}', patients={self.patients_analyzed}, duration={self.execution_duration_ms}ms)>"
