"""
Cleaning Task Model
===================
Tracks assignments of cleaners to specific beds.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.models.base import Base

class CleaningTaskModel(Base):
    """Event log for a specific bed cleaning task."""
    __tablename__ = "cleaning_tasks"

    cleaner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cleaners.id", ondelete="CASCADE"), nullable=False)
    bed_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("beds.id", ondelete="CASCADE"), nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending") # pending, in_progress, completed
    reasoning: Mapped[str | None] = mapped_column(String(255), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    bed = relationship("Bed", foreign_keys=[bed_id])
    cleaner = relationship("CleanerModel", foreign_keys=[cleaner_id])

    def __repr__(self) -> str:
        return f"<CleaningTask(id={self.id}, cleaner_id={self.cleaner_id}, bed_id={self.bed_id}, status='{self.status}')>"
