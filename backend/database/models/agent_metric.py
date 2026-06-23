"""
Agent Metric Model
==================
Stores persistent metrics for each agent (e.g. patients analyzed, actions completed).
"""

from datetime import datetime

from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base

class AgentMetric(Base):
    """Persistent metrics for an individual agent."""

    __tablename__ = "agent_metrics"

    agent_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    patients_analyzed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    actions_executed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<AgentMetric(agent_id='{self.agent_id}', patients={self.patients_analyzed}, actions={self.actions_executed})>"
