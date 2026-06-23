"""
Cleaner Model
=============
Stores Cleaner profiles and current statuses.
"""

from sqlalchemy import String, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base


class CleanerModel(Base):
    """Persisted cleaning staff profile."""
    __tablename__ = "cleaners"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    years_of_experience: Mapped[int] = mapped_column(Integer, nullable=False)
    shift: Mapped[str] = mapped_column(String(50), nullable=False)
    availability_status: Mapped[str] = mapped_column(String(50), default="Available") # Available, Assigned, Cleaning, Break, Off Duty
    
    assigned_tasks: Mapped[list | None] = mapped_column(JSON, nullable=True) # list of task IDs or simple summaries
    completed_tasks: Mapped[int] = mapped_column(Integer, default=0)
    current_location: Mapped[str] = mapped_column(String(100), nullable=True)

    def __repr__(self) -> str:
        return f"<Cleaner(id={self.id}, name={self.name}, status={self.availability_status})>"
