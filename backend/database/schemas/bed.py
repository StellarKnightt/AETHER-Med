from pydantic import BaseModel, Field
import uuid
from typing import Optional, List
from datetime import datetime

class BedHistoryResponse(BaseModel):
    id: uuid.UUID
    bed_id: uuid.UUID
    patient_id: Optional[uuid.UUID] = None
    event_type: str
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class BedResponse(BaseModel):
    id: uuid.UUID
    bed_number: str
    bed_type: str
    status: str
    ward: str
    patient_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

class BedCreate(BaseModel):
    bed_number: str
    bed_type: str
    ward: str

class BedUpdate(BaseModel):
    status: Optional[str] = None
    patient_id: Optional[uuid.UUID] = None

class BedAgentResult(BaseModel):
    patient_id: uuid.UUID
    triage_priority: int
    recommended_ward: str
    bed_type_needed: str
    assigned_bed_id: Optional[uuid.UUID] = None
    assigned_bed_number: Optional[str] = None
    reasoning: List[str] = []
    status: str = "pending" # pending, approved, rejected
