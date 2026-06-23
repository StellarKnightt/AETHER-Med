"""
Simulation Pydantic Schemas
===========================
Data transfer objects for the simulation layer endpoints and WebSockets.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class PatientSchema(BaseModel):
    id: uuid.UUID
    name: str
    age: int
    gender: str
    status: str
    triage_level: Optional[int] = None
    medical_history: Optional[Dict[str, Any]] = None
    allergies: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class BedSchema(BaseModel):
    id: uuid.UUID
    bed_number: str
    bed_type: str
    status: str
    patient_id: Optional[uuid.UUID] = None
    
    model_config = ConfigDict(from_attributes=True)

class VitalsSchema(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    heart_rate: float
    systolic_bp: float
    diastolic_bp: float
    oxygen_saturation: float
    respiratory_rate: float
    temperature: float
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class EventSchema(BaseModel):
    id: uuid.UUID
    event_type: str
    severity: str
    description: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class VitalsStreamMessage(BaseModel):
    type: str = "vitals_update"
    vitals: VitalsSchema

class BedStreamMessage(BaseModel):
    type: str = "bed_update"
    bed: BedSchema

class EventStreamMessage(BaseModel):
    type: str = "event_update"
    event: EventSchema
