import asyncio
import json
import uuid
import sys
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import select
from backend.database.session.connection import async_session_factory, init_db
from backend.database.models.patient import Patient
from backend.database.models.triage_result import TriageResultModel
from backend.agents.registry.agent_loader import initialize_agents
from backend.graph.workflows.sequential_executor import execute_sequential_workflow
from backend.database.models.pharma_result import PharmaResultModel
from backend.database.models.scheduler_result import SchedulerResultModel
from backend.database.models.bed_result import BedResultModel
from backend.database.models.workflow_execution import WorkflowExecutionModel

PATIENTS_DATA = [
    {
        "name": "Audit Cardiac", "age": 65, "gender": "Male",
        "diseases": ["Hypertension", "Coronary Artery Disease"],
        "symptoms": ["Severe crushing chest pain", "Radiating left arm pain", "Diaphoresis"],
        "medications": ["Aspirin", "Nitroglycerin"], "allergies": []
    },
    {
        "name": "Audit Pneumonia", "age": 72, "gender": "Female",
        "diseases": ["COPD"],
        "symptoms": ["Productive cough", "High fever", "Shortness of breath", "O2 saturation 88%"],
        "medications": ["Albuterol inhaler"], "allergies": ["Penicillin"]
    },
    {
        "name": "Audit Asthma", "age": 22, "gender": "Female",
        "diseases": ["Asthma"],
        "symptoms": ["Wheezing", "Tight chest", "Unable to speak in full sentences"],
        "medications": ["Symbicort"], "allergies": ["Pollen"]
    },
    {
        "name": "Audit Allergy", "age": 34, "gender": "Male",
        "diseases": [],
        "symptoms": ["Facial swelling", "Hives", "Throat closing after eating peanuts"],
        "medications": ["EpiPen used once prior to arrival"], "allergies": ["Peanuts"]
    },
    {
        "name": "Audit Stroke", "age": 78, "gender": "Female",
        "diseases": ["Atrial Fibrillation"],
        "symptoms": ["Sudden right-sided weakness", "Facial droop", "Slurred speech started 30 mins ago"],
        "medications": ["Warfarin"], "allergies": []
    },
    {
        "name": "Audit Diabetes", "age": 55, "gender": "Male",
        "diseases": ["Type 1 Diabetes"],
        "symptoms": ["Confusion", "Fruity breath odor", "Blood glucose HIGH", "Vomiting"],
        "medications": ["Insulin Glargine"], "allergies": ["Sulfa drugs"]
    },
    {
        "name": "Audit Oncology", "age": 60, "gender": "Female",
        "diseases": ["Breast Cancer (Metastatic)"],
        "symptoms": ["Fever 102F", "Chills", "Neutropenic"],
        "medications": ["Chemotherapy (Doxorubicin)"], "allergies": []
    },
    {
        "name": "Audit Orthopedic", "age": 28, "gender": "Male",
        "diseases": [],
        "symptoms": ["Deformed right ankle after fall", "Extreme pain", "Unable to bear weight"],
        "medications": ["Ibuprofen"], "allergies": []
    }
]

def analyze_consistency(patient, triage_res, pharma_res, sched_res, bed_res):
    issues = []
    
    # 1. Patient -> Triage Consistency
    # Orthopedic case should rarely be CRITICAL unless there's massive hemorrhage (not stated)
    if "Orthopedic" in patient.name and triage_res.get("priority") == "CRITICAL":
        issues.append({"agent": "Triage", "type": "symptom_mismatch", "detail": f"Orthopedic injury marked CRITICAL. Expected HIGH or MODERATE. Reasoning: {triage_res.get('reasoning')}"})
    
    # 2. Triage -> Pharma -> Scheduler
    triage_priority = triage_res.get("priority", "UNKNOWN")
    pharma_risk = pharma_res.get("risk_level", "UNKNOWN")
    sched_priority = sched_res.get("priority_level", "UNKNOWN")
    
    # Map back to standard categories for comparison
    sched_to_triage = {
        "CRITICAL_PRIORITY": "CRITICAL",
        "HIGH_PRIORITY": "HIGH",
        "NORMAL_PRIORITY": "MODERATE",
        "LOW_PRIORITY": "LOW"
    }
    normalized_sched = sched_to_triage.get(sched_priority, "UNKNOWN")
    
    if triage_priority == "CRITICAL" and normalized_sched in ["MODERATE", "LOW"]:
        issues.append({"agent": "Scheduler", "type": "priority_downgrade", "detail": f"Triage CRITICAL downgraded to {sched_priority} without justification."})
        
    if pharma_risk == "HIGH" and normalized_sched in ["MODERATE", "LOW"]:
        issues.append({"agent": "Scheduler", "type": "priority_downgrade", "detail": f"Pharma HIGH risk downgraded to {sched_priority}."})
        
    # 3. Scheduler -> Bed
    ward = bed_res.get("recommended_ward", "").lower()
    bed_type = bed_res.get("bed_type_needed", "").lower()
    
    if triage_priority == "CRITICAL" and "icu" not in ward and "intensive" not in ward and "resuscitation" not in ward:
         issues.append({"agent": "Bed", "type": "inappropriate_bed", "detail": f"CRITICAL patient not assigned to ICU/Emergency. Assigned: {ward}"})
         
    return issues

async def run_audit():
    print("Initializing Database...")
    await init_db()
    
    print("Initializing Agents...")
    agent_registry = initialize_agents()
    triage_agent = agent_registry.get_agent("TriageAgent")
    
    results = []
    total_issues = 0
    
    async with async_session_factory() as session:
        for idx, p_data in enumerate(PATIENTS_DATA):
            print(f"\n[{idx+1}/8] Processing Patient: {p_data['name']}...")
            
            # Create Patient
            patient = Patient(
                name=p_data["name"],
                age=p_data["age"],
                gender=p_data["gender"],
                diseases=p_data["diseases"],
                symptoms=p_data["symptoms"],
                medications=p_data["medications"],
                allergies=p_data["allergies"],
                status="waiting"
            )
            session.add(patient)
            await session.commit()
            await session.refresh(patient)
            patient_id = patient.id
            
            # 1. Manual Triage Run
            triage_input = {
                "patient_id": str(patient_id),
                "name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "diseases": patient.diseases,
                "symptoms": patient.symptoms,
                "medications": patient.medications,
                "allergies": patient.allergies,
                "vitals": {
                    "heart_rate": 80,
                    "blood_pressure": "120/80",
                    "temperature": 98.6,
                    "oxygen_saturation": 98,
                    "respiratory_rate": 16
                }
            }
            try:
                triage_output = await triage_agent.invoke_direct(triage_input)
                # Save TriageResultModel
                triage_model = TriageResultModel(
                    patient_id=patient_id,
                    priority=triage_output.get("priority", "MODERATE"),
                    severity_score=triage_output.get("severity_score", 5.0),
                    diseases=triage_output.get("diseases", []),
                    symptoms=triage_output.get("symptoms", []),
                    reasoning=triage_output.get("reasoning", []),
                    status="approved"
                )
                session.add(triage_model)
                await session.commit()
                await session.refresh(triage_model)
                triage_id = str(triage_model.id)
            except Exception as e:
                print(f"  [ERROR] Triage failed: {e}")
                continue
                
            # 2. Sequential Workflow
            try:
                await execute_sequential_workflow(triage_id)
            except Exception as e:
                print(f"  [ERROR] Workflow failed: {e}")
                continue
                
            await asyncio.sleep(1) # Give DB time
            
            # Fetch Results
            exec_model = (await session.execute(select(WorkflowExecutionModel).where(WorkflowExecutionModel.patient_id == patient_id).order_by(WorkflowExecutionModel.created_at.desc()))).scalars().first()
            if not exec_model:
                print(f"  [ERROR] No Workflow Execution found.")
                continue
                
            agent_outputs = dict(exec_model.agent_outputs)
            triage_res = agent_outputs.get("triage", {})
            pharma_res = agent_outputs.get("pharma", {})
            sched_res = agent_outputs.get("scheduler", {})
            bed_res = agent_outputs.get("bed", {})
            
            issues = analyze_consistency(patient, triage_res, pharma_res, sched_res, bed_res)
            total_issues += len(issues)
            
            results.append({
                "patient": patient.name,
                "triage_priority": triage_res.get("priority"),
                "pharma_risk": pharma_res.get("risk_level"),
                "sched_priority": sched_res.get("priority_level"),
                "ward": bed_res.get("recommended_ward"),
                "issues": issues
            })
            
    print("\n==================================================")
    print("              INITIAL AUDIT RESULTS               ")
    print("==================================================")
    
    agent_errors = {"Triage": 0, "Pharma": 0, "Scheduler": 0, "Bed": 0}
    
    for r in results:
        print(f"\nPatient: {r['patient']}")
        print(f"  Triage: {r['triage_priority']}")
        print(f"  Pharma: {r['pharma_risk']}")
        print(f"  Scheduler: {r['sched_priority']}")
        print(f"  Bed: {r['ward']}")
        
        if len(r["issues"]) == 0:
            print("  [OK] Consistent.")
        else:
            for issue in r["issues"]:
                print(f"  [X] {issue['agent']} Error: {issue['detail']}")
                if issue['agent'] in agent_errors:
                    agent_errors[issue['agent']] += 1
                    
    print("\n--- CONSISTENCY SCORES ---")
    for agent, errs in agent_errors.items():
        score = max(0, 100 - (errs * (100 // 8))) # rough percentage calculation
        print(f"{agent}: {score}% ({errs} errors out of 8 workflows)")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_audit())
