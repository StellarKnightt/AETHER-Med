"""
Scheduler Service
=================
Service layer connecting the Scheduler Agent to the Database and WebSockets.
"""
from backend.database.session.connection import async_session_factory
from backend.database.models.patient import Patient
from backend.database.models.pharma_result import PharmaResultModel
from backend.database.models.scheduler_result import SchedulerResultModel
from backend.database.models.doctor import DoctorModel
from backend.database.models.nurse import NurseModel
from backend.api.websocket.handler import ws_manager
from backend.utils.logger import agent_logger
from sqlalchemy import select
import uuid
import json
from typing import Any

class SchedulerService:
    @staticmethod
    def _is_valid_uuid(val) -> bool:
        try:
            uuid.UUID(str(val))
            return True
        except (ValueError, TypeError, AttributeError):
            return False

    @staticmethod
    async def get_patient_data(patient_id: str) -> dict:
        try:
            if not SchedulerService._is_valid_uuid(patient_id):
                return {}
            async with async_session_factory() as session:
                patient = await session.get(Patient, patient_id)
                if not patient:
                    return {}
                
                # Fetch latest Pharma result for this patient
                query = select(PharmaResultModel).where(PharmaResultModel.patient_id == patient_id).order_by(PharmaResultModel.created_at.desc())
                pharma_res = await session.execute(query)
                latest_pharma = pharma_res.scalars().first()
                
                pharma_risk = latest_pharma.risk_level if latest_pharma else "UNKNOWN"
                pharma_interactions = latest_pharma.interactions_detected if latest_pharma else []
                
                return {
                    "id": str(patient.id),
                    "name": patient.name,
                    "triage_level": patient.triage_level,
                    "pharma_risk_level": pharma_risk,
                    "pharma_interactions": pharma_interactions,
                    "symptoms": patient.symptoms or []
                }
        except Exception as e:
            agent_logger.error(f"Error fetching patient data for scheduler: {e}")
            return {}

    @staticmethod
    async def get_staff_data() -> dict:
        """Fetch available doctors and nurses for the LLM to choose from."""
        try:
            async with async_session_factory() as session:
                doc_query = select(DoctorModel).where(DoctorModel.availability_status != 'On Leave').order_by(DoctorModel.current_workload_score.asc())
                nurse_query = select(NurseModel).where(NurseModel.availability_status != 'On Leave').order_by(NurseModel.current_workload_score.asc())
                
                doctors = (await session.execute(doc_query)).scalars().all()
                nurses = (await session.execute(nurse_query)).scalars().all()
                
                return {
                    "doctors": [{
                        "id": str(d.id),
                        "name": d.name,
                        "specialization": d.specialization,
                        "department": d.department,
                        "workload_score": d.current_workload_score,
                        "availability_status": d.availability_status,
                        "emergency_response_capability": d.emergency_response_capability
                    } for d in doctors],
                    "nurses": [{
                        "id": str(n.id),
                        "name": n.name,
                        "qualification": n.qualification,
                        "department": n.department,
                        "workload_score": n.current_workload_score,
                        "availability_status": n.availability_status,
                        "emergency_support_capability": n.emergency_support_capability
                    } for n in nurses]
                }
        except Exception as e:
            agent_logger.error(f"Error fetching staff data: {e}")
            return {"doctors": [], "nurses": []}

    @staticmethod
    async def save_scheduler_result(patient_id: str, result: dict) -> SchedulerResultModel:
        async with async_session_factory() as session:
            db_result = SchedulerResultModel(
                patient_id=patient_id,
                priority_level=result.get("priority_level", "NORMAL_PRIORITY"),
                confidence=result.get("confidence", 0.0),
                assigned_doctor_id=result.get("assigned_doctor_id"),
                assigned_nurse_id=result.get("assigned_nurse_id"),
                assigned_doctor_name=result.get("assigned_doctor_name"),
                assigned_nurse_name=result.get("assigned_nurse_name"),
                reasoning_chain=result.get("reasoning_chain", []),
                workflow_actions=result.get("workflow_actions", []),
                status="completed"
            )
            session.add(db_result)
            
            def is_valid_uuid(val: str) -> bool:
                try:
                    uuid.UUID(str(val))
                    return True
                except ValueError:
                    return False
            
            # Update Doctor workload
            if db_result.assigned_doctor_id and is_valid_uuid(db_result.assigned_doctor_id):
                doc = await session.get(DoctorModel, db_result.assigned_doctor_id)
                if doc:
                    doc.current_workload_score = min(100.0, doc.current_workload_score + 15.0)
                    patients = list(doc.assigned_patients or [])
                    if str(patient_id) not in patients:
                        patients.append(str(patient_id))
                    doc.assigned_patients = patients

            # Update Nurse workload
            if db_result.assigned_nurse_id and is_valid_uuid(db_result.assigned_nurse_id):
                nurse = await session.get(NurseModel, db_result.assigned_nurse_id)
                if nurse:
                    nurse.current_workload_score = min(100.0, nurse.current_workload_score + 10.0)
                    patients = list(nurse.assigned_patients or [])
                    if str(patient_id) not in patients:
                        patients.append(str(patient_id))
                    nurse.assigned_patients = patients

            await session.commit()
            await session.refresh(db_result)
            return db_result

    @staticmethod
    async def broadcast_scheduler_event(patient_id: str, result: dict):
        event = {
            "type": "scheduler_result",
            "patient_id": patient_id,
            "data": result
        }
        await ws_manager.broadcast(event)
