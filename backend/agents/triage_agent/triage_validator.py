"""
Triage Validator
================
Pydantic schemas for validating triage input data.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator

class VitalsInput(BaseModel):
    hr: Optional[float] = Field(None, description="Heart Rate in bpm")
    spo2: Optional[float] = Field(None, description="Oxygen Saturation %")
    rr: Optional[float] = Field(None, description="Respiratory Rate in breaths/min")
    sbp: Optional[float] = Field(None, description="Systolic Blood Pressure in mmHg")
    temp: Optional[float] = Field(None, description="Body Temperature in Celsius")

    @field_validator('hr', 'spo2', 'rr', 'sbp', 'temp')
    @classmethod
    def check_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError("Vital signs must be positive numbers")
        return v

class TriageInput(BaseModel):
    patient_id: str = Field(..., description="Unique patient identifier")
    age: int = Field(..., description="Patient age in years")
    gender: str = Field(default="Unknown")
    vitals: VitalsInput
    symptoms: List[str] = Field(default_factory=list, description="Reported symptoms")
    history: List[str] = Field(default_factory=list, description="Medical history")
    diseases: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)
    blood_group: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    smoking_status: Optional[str] = None
    alcohol_consumption: Optional[str] = None
    risk_factors: List[str] = Field(default_factory=list)

    @field_validator('age')
    @classmethod
    def check_age(cls, v):
        if v < 0 or v > 130:
            raise ValueError("Age must be between 0 and 130")
        return v
