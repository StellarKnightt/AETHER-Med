"""
Scheduler Result Model
====================
Stores scheduler decisions, assignments, and workflow actions.
"""

from sqlalchemy import String, Float, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base


class SchedulerResultModel(Base):
    """Persisted scheduler result with reasoning and workflow state."""

    __tablename__ = "scheduler_results"

    patient_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    priority_level: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    assigned_doctor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    assigned_nurse_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    assigned_doctor_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    assigned_nurse_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reasoning_chain: Mapped[list | None] = mapped_column(JSON, nullable=True)
    workflow_actions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # pending | approved | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending")

    def __repr__(self) -> str:
        return f"<SchedulerResult(id={self.id}, patient={self.patient_id}, priority_level={self.priority_level}, status={self.status})>"
