"""
Meta-Agent Models
=================
Stores continuous monitoring sessions, real-time agent health scores, 
detected ecosystem failures, and self-healing recovery actions.
"""

from sqlalchemy import String, Integer, Float, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from backend.database.models.base import Base

class MetaAgentSession(Base):
    """Tracks a continuous meta-agent monitoring session."""
    __tablename__ = "meta_agent_sessions"

    status: Mapped[str] = mapped_column(String(20), default="active") # active, stopped
    started_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stopped_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    events_processed: Mapped[int] = mapped_column(Integer, default=0)
    failures_detected: Mapped[int] = mapped_column(Integer, default=0)
    recoveries_completed: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<MetaAgentSession(id={self.id}, status={self.status})>"

class MetaAgentHealthScore(Base):
    """Dynamic health and performance metrics for an agent."""
    __tablename__ = "meta_agent_health_scores"

    agent_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="healthy") # healthy, degraded, critical, recovering
    
    health_score: Mapped[float] = mapped_column(Float, default=100.0)
    reliability_score: Mapped[float] = mapped_column(Float, default=100.0)
    reasoning_quality: Mapped[float] = mapped_column(Float, default=100.0)
    workflow_compliance: Mapped[float] = mapped_column(Float, default=100.0)
    communication_score: Mapped[float] = mapped_column(Float, default=100.0)
    
    active_failures: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<MetaAgentHealthScore(agent={self.agent_name}, health={self.health_score})>"

class MetaAgentIncident(Base):
    """A detected agent failure or misbehavior."""
    __tablename__ = "meta_agent_incidents"

    event_id: Mapped[UUID | None] = mapped_column(ForeignKey("security_events.id", ondelete="SET NULL"), nullable=True)
    failure_type: Mapped[str] = mapped_column(String(100), nullable=False)
    failure_category: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    affected_agent: Mapped[str] = mapped_column(String(50), nullable=False)
    
    root_cause: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_actions: Mapped[list] = mapped_column(JSON, nullable=False) # List of actions
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    
    status: Mapped[str] = mapped_column(String(30), default="detected") # detected, pending_approval, approved, rejected, recovering, recovered
    
    before_health: Mapped[float | None] = mapped_column(Float, nullable=True)
    after_health: Mapped[float | None] = mapped_column(Float, nullable=True)

    def __repr__(self) -> str:
        return f"<MetaAgentIncident(id={self.id}, agent={self.affected_agent}, type={self.failure_type})>"

class MetaAgentRecoveryAction(Base):
    """Individual recovery actions executed by the Meta-Agent."""
    __tablename__ = "meta_agent_recovery_actions"

    incident_id: Mapped[UUID] = mapped_column(ForeignKey("meta_agent_incidents.id", ondelete="CASCADE"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    status: Mapped[str] = mapped_column(String(20), default="pending") # pending, approved, rejected, executing, completed, failed
    execution_result: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<MetaAgentRecoveryAction(id={self.id}, type={self.action_type}, status={self.status})>"
