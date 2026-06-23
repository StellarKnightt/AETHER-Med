"""
Event Model
===========
Hospital-wide event logs for the simulation layer.
"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base


class HospitalEvent(Base):
    """Hospital event record."""

    __tablename__ = "hospital_events"

    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # e.g., 'surge', 'ambulance_arrival', 'icu_overload'
    severity: Mapped[str] = mapped_column(String(50), nullable=False) # low, medium, high, critical
    description: Mapped[str] = mapped_column(Text, nullable=False)

    def __repr__(self) -> str:
        return f"<HospitalEvent(id={self.id}, type='{self.event_type}', severity='{self.severity}')>"
