import asyncio
import os
import sys
import uuid
from dotenv import load_dotenv

# Add project root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

load_dotenv()

from backend.database.session.connection import async_session_factory, init_db
from backend.database.models.patient import Patient
from backend.database.models.vitals import PatientVitals
from backend.database.models.workflow_execution import WorkflowExecutionModel
from backend.database.models.triage_result import TriageResultModel
from backend.database.models.pharma_result import PharmaResultModel
from backend.database.models.scheduler_result import SchedulerResultModel
from backend.database.models.bed_result import BedResultModel
from sqlalchemy import select, delete

PATIENTS_DATA = [
    {
        "name": "Marcus Sterling",
        "age": 58,
        "gender": "Male",
        "diseases": ["Coronary Artery Disease", "Hypertension"],
        "symptoms": ["Severe crushing chest pain", "Radiating left arm pain", "Dyspnea"],
        "allergies": [],
        "medications": ["Lisinopril", "Aspirin"],
        "blood_group": "O+",
        "weight": 82.5,
        "height": 178.0,
        "smoking_status": "former",
        "alcohol_consumption": "social",
        "previous_hospitalizations": 1,
        "risk_factors": ["Hypertension", "Age", "Family History"],
        "status": "registered",
        "vitals": {
            "heart_rate": 115.0,
            "systolic_bp": 90.0,
            "diastolic_bp": 60.0,
            "oxygen_saturation": 89.0,
            "respiratory_rate": 24.0,
            "temperature": 37.0
        }
    },
    {
        "name": "Elena Vance",
        "age": 29,
        "gender": "Female",
        "diseases": ["Streptococcal Pharyngitis", "Asthma"],
        "symptoms": ["Throat swelling", "Difficulty swallowing", "Wheezing"],
        "allergies": ["Penicillin"],
        "medications": ["Albuterol"],
        "blood_group": "A-",
        "weight": 64.0,
        "height": 165.0,
        "smoking_status": "never",
        "alcohol_consumption": "none",
        "previous_hospitalizations": 0,
        "risk_factors": ["Asthma"],
        "status": "registered",
        "vitals": {
            "heart_rate": 95.0,
            "systolic_bp": 115.0,
            "diastolic_bp": 75.0,
            "oxygen_saturation": 93.0,
            "respiratory_rate": 20.0,
            "temperature": 38.5
        }
    },
    {
        "name": "Arthur Pendelton",
        "age": 74,
        "gender": "Male",
        "diseases": ["Urosepsis", "Type II Diabetes", "Hypertension"],
        "symptoms": ["Confusion", "Lethargy", "Fever", "Severe hypotension"],
        "allergies": ["Sulfa Drugs"],
        "medications": ["Metformin", "Amlodipine"],
        "blood_group": "B+",
        "weight": 88.0,
        "height": 172.0,
        "smoking_status": "never",
        "alcohol_consumption": "none",
        "previous_hospitalizations": 3,
        "risk_factors": ["Advanced Age", "Sepsis Risk", "Diabetes"],
        "status": "registered",
        "vitals": {
            "heart_rate": 125.0,
            "systolic_bp": 80.0,
            "diastolic_bp": 45.0,
            "oxygen_saturation": 87.0,
            "respiratory_rate": 26.0,
            "temperature": 39.5
        }
    },
    {
        "name": "Chloe Fraser",
        "age": 34,
        "gender": "Female",
        "diseases": ["Gastroesophageal Reflux Disease"],
        "symptoms": ["Epigastric burning pain", "Mild nausea"],
        "allergies": [],
        "medications": ["Omeprazole"],
        "blood_group": "AB+",
        "weight": 58.0,
        "height": 168.0,
        "smoking_status": "never",
        "alcohol_consumption": "social",
        "previous_hospitalizations": 0,
        "risk_factors": [],
        "status": "registered",
        "vitals": {
            "heart_rate": 78.0,
            "systolic_bp": 120.0,
            "diastolic_bp": 80.0,
            "oxygen_saturation": 98.0,
            "respiratory_rate": 16.0,
            "temperature": 36.8
        }
    },
    {
        "name": "Gordon Freeman",
        "age": 47,
        "gender": "Male",
        "diseases": ["COPD Exacerbation", "Emphysema"],
        "symptoms": ["Severe shortness of breath", "Cyanosis", "Tachypnea"],
        "allergies": [],
        "medications": ["Tiotropium"],
        "blood_group": "O-",
        "weight": 76.0,
        "height": 180.0,
        "smoking_status": "former",
        "alcohol_consumption": "none",
        "previous_hospitalizations": 2,
        "risk_factors": ["COPD", "Hypoxia"],
        "status": "registered",
        "vitals": {
            "heart_rate": 110.0,
            "systolic_bp": 135.0,
            "diastolic_bp": 85.0,
            "oxygen_saturation": 82.0,
            "respiratory_rate": 28.0,
            "temperature": 37.2
        }
    }
]

async def seed_audit_patients():
    print("Connecting to DB and initializing schemas...")
    await init_db()
    
    async with async_session_factory() as session:
        for p_info in PATIENTS_DATA:
            name = p_info["name"]
            
            # Clean existing patient with this name
            result = await session.execute(select(Patient).where(Patient.name == name))
            existing_p = result.scalar_one_or_none()
            if existing_p:
                print(f"Cleaning existing patient record and dependencies for '{name}'...")
                p_id = existing_p.id
                # Delete dependencies first
                await session.execute(delete(PatientVitals).where(PatientVitals.patient_id == p_id))
                await session.execute(delete(WorkflowExecutionModel).where(WorkflowExecutionModel.patient_id == p_id))
                await session.execute(delete(TriageResultModel).where(TriageResultModel.patient_id == p_id))
                await session.execute(delete(PharmaResultModel).where(PharmaResultModel.patient_id == p_id))
                await session.execute(delete(SchedulerResultModel).where(SchedulerResultModel.patient_id == p_id))
                await session.execute(delete(BedResultModel).where(BedResultModel.patient_id == p_id))
                await session.delete(existing_p)
                await session.commit()
                
            # Create Patient
            patient_id = uuid.uuid4()
            db_patient = Patient(
                id=patient_id,
                name=name,
                age=p_info["age"],
                gender=p_info["gender"],
                diseases=p_info["diseases"],
                symptoms=p_info["symptoms"],
                allergies=p_info["allergies"],
                medications=p_info["medications"],
                blood_group=p_info["blood_group"],
                weight=p_info["weight"],
                height=p_info["height"],
                smoking_status=p_info["smoking_status"],
                alcohol_consumption=p_info["alcohol_consumption"],
                previous_hospitalizations=p_info["previous_hospitalizations"],
                risk_factors=p_info["risk_factors"],
                status=p_info["status"]
            )
            session.add(db_patient)
            await session.commit()
            
            # Create Patient Vitals
            v_info = p_info["vitals"]
            db_vitals = PatientVitals(
                id=uuid.uuid4(),
                patient_id=patient_id,
                heart_rate=v_info["heart_rate"],
                systolic_bp=v_info["systolic_bp"],
                diastolic_bp=v_info["diastolic_bp"],
                oxygen_saturation=v_info["oxygen_saturation"],
                respiratory_rate=v_info["respiratory_rate"],
                temperature=v_info["temperature"]
            )
            session.add(db_vitals)
            await session.commit()
            print(f"OK Seeded patient '{name}' (ID: {patient_id}) with baseline vitals.")

if __name__ == "__main__":
    asyncio.run(seed_audit_patients())
