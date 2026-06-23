"""
Sentinel Agent Models
=====================
Stores threat incidents detected by Sentinel, trust scores for monitored agents,
and session tracking data.
"""

from sqlalchemy import String, Integer, Float, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from backend.database.models.base import Base

class SentinelIncident(Base):
    """A threat or violation incident detected by the Sentinel Agent."""
    __tablename__ = "sentinel_incidents"

    event_id: Mapped[UUID | None] = mapped_column(ForeignKey("security_events.id", ondelete="SET NULL"), nullable=True)
    threat_type: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    affected_agent: Mapped[str] = mapped_column(String(50), nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="pending") # pending, approved, rejected, executed
    response_action: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<SentinelIncident(id={self.id}, type={self.threat_type}, agent={self.affected_agent}, status={self.status})>"

class SentinelTrustScore(Base):
    """Dynamic trust and compliance scores for a specific agent."""
    __tablename__ = "sentinel_trust_scores"

    agent_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    trust_score: Mapped[float] = mapped_column(Float, default=100.0)
    privacy_score: Mapped[float] = mapped_column(Float, default=100.0)
    security_score: Mapped[float] = mapped_column(Float, default=100.0)
    compliance_score: Mapped[float] = mapped_column(Float, default=100.0)
    incident_count: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<SentinelTrustScore(agent={self.agent_name}, trust={self.trust_score})>"

class SentinelSession(Base):
    """Tracks a continuous monitoring session."""
    __tablename__ = "sentinel_sessions"

    status: Mapped[str] = mapped_column(String(20), default="active") # active, stopped
    started_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stopped_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    events_processed: Mapped[int] = mapped_column(Integer, default=0)
    incidents_detected: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<SentinelSession(id={self.id}, status={self.status})>"
