"""
Security Simulation Models
==========================
Stores simulation runs and individual security/privacy events.
"""

from sqlalchemy import String, Integer, Float, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from backend.database.models.base import Base

class SecuritySimulation(Base):
    """Stores simulation run definitions and overall status."""
    __tablename__ = "security_simulations"

    simulation_type: Mapped[str] = mapped_column(String(20), default="sentinel")
    failure_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    failure_frequency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scenario_category: Mapped[str] = mapped_column(String(50), nullable=False)
    scenario_name: Mapped[str] = mapped_column(String(200), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    intensity: Mapped[int] = mapped_column(Integer, default=5)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=60)
    target_agents: Mapped[list | None] = mapped_column(JSON, nullable=True)
    violation_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    started_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<SecuritySimulation(id={self.id}, name={self.scenario_name}, status={self.status})>"

class SecurityEvent(Base):
    """Stores individual event/violation log entries generated during a simulation."""
    __tablename__ = "security_events"

    simulation_id: Mapped[UUID | None] = mapped_column(ForeignKey("security_simulations.id", ondelete="CASCADE"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    affected_agent: Mapped[str] = mapped_column(String(50), nullable=False)
    target_entity: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="detected")

    def __repr__(self) -> str:
        return f"<SecurityEvent(id={self.id}, type={self.event_type}, severity={self.severity})>"
