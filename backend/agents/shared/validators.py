"""
Shared Validators
=================
Reusable Pydantic validators for structured outputs and state models.
"""

from typing import Any, Callable

def validate_confidence_score(v: float) -> float:
    """Validate that a confidence score is between 0.0 and 1.0."""
    if not (0.0 <= v <= 1.0):
        raise ValueError("Confidence score must be between 0.0 and 1.0")
    return v

def validate_patient_id(v: str) -> str:
    """Validate patient ID format (if any specific format is required)."""
    if not v or not isinstance(v, str):
        raise ValueError("Patient ID must be a non-empty string")
    return v.strip()
