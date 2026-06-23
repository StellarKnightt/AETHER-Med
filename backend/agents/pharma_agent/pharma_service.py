"""
Pharma Service
==============
Service layer connecting the Pharma Agent to the Database and WebSockets.
"""
from backend.database.session.connection import async_session_factory
from backend.database.models.patient import Patient
from backend.database.models.pharma_result import PharmaResultModel
from backend.api.websocket.handler import ws_manager
from backend.utils.logger import agent_logger

class PharmaService:
    @staticmethod
    async def get_patient_data(patient_id: str) -> dict:
        try:
            async with async_session_factory() as session:
                patient = await session.get(Patient, patient_id)
                if not patient:
                    return {}
                return {
                    "id": str(patient.id),
                    "name": patient.name,
                    "age": patient.age,
                    "gender": patient.gender,
                    "diseases": patient.diseases or [],
                    "symptoms": patient.symptoms or [],
                    "medications": patient.medications or [],
                    "allergies": patient.allergies or [],
                    "blood_group": patient.blood_group,
                    "weight": patient.weight,
                    "height": patient.height,
                    "smoking_status": patient.smoking_status,
                    "alcohol_consumption": patient.alcohol_consumption,
                    "emergency_contact": patient.emergency_contact,
                    "previous_hospitalizations": patient.previous_hospitalizations,
                    "risk_factors": patient.risk_factors or [],
                    "vitals": {} # Handled elsewhere or skipped
                }
        except Exception as e:
            agent_logger.error(f"Error fetching patient data: {e}")
            return {}

    @staticmethod
    async def save_pharma_result(patient_id: str, result: dict) -> PharmaResultModel:
        async with async_session_factory() as session:
            db_result = PharmaResultModel(
                patient_id=patient_id,
                risk_level=result.get("risk_level", "MODERATE_RISK"),
                confidence=result.get("confidence", 0.0),
                reasoning=result.get("reasoning", []),
                interactions_detected=result.get("interactions_detected", []),
                recommended_actions=result.get("recommended_actions", []),
                status="pending"
            )
            session.add(db_result)
            await session.commit()
            await session.refresh(db_result)
            return db_result

    @staticmethod
    async def broadcast_pharma_event(patient_id: str, result: dict):
        event = {
            "type": "pharma_result",
            "patient_id": patient_id,
            "data": result
        }
        await ws_manager.broadcast(event)
