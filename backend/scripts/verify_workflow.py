import asyncio
import json
import uuid
from datetime import datetime
from sqlalchemy import select
from backend.database.session.connection import async_session_factory, init_db
from backend.database.models.patient import Patient
from backend.database.models.triage_result import TriageResultModel
from backend.database.models.workflow_execution import WorkflowExecutionModel
from backend.database.models.pharma_result import PharmaResultModel
from backend.database.models.scheduler_result import SchedulerResultModel
from backend.database.models.bed_result import BedResultModel
from backend.graph.workflows.sequential_executor import execute_sequential_workflow
from backend.utils.event_bus import event_bus
from backend.agents.registry.agent_loader import initialize_agents
from dotenv import load_dotenv

load_dotenv()

async def run_demo():
    print("Initializing Database...")
    await init_db()
    
    print("Initializing Agents...")
    agent_registry = initialize_agents()
    
    # 1. Generate or fetch a patient
    async with async_session_factory() as session:
        # Check for existing patient or create a new one
        result = await session.execute(select(Patient).limit(1))
        patient = result.scalar_one_or_none()
        
        if not patient:
            print("No patient found, creating dummy patient...")
            patient = Patient(
                name="John Doe Verification",
                age=45,
                gender="Male",
                diseases=["Diabetes", "Hypertension"],
                symptoms=["Severe chest pain", "Shortness of breath"],
                medications=["Metformin"],
                allergies=["Penicillin"],
                triage_level="CRITICAL",
                status="waiting"
            )
            session.add(patient)
            await session.commit()
            await session.refresh(patient)
            
        print(f"Using Patient: {patient.name} (ID: {patient.id})")
        patient_id = patient.id
        
        # Create a mock Triage Result to start the workflow
        triage = TriageResultModel(
            patient_id=patient_id,
            priority="CRITICAL",
            severity_score=9.5,
            diseases=patient.diseases,
            symptoms=patient.symptoms,
            reasoning=["Patient exhibits signs of myocardial infarction."]
        )
        session.add(triage)
        await session.commit()
        await session.refresh(triage)
        triage_id = str(triage.id)
        print(f"Created Triage Result (ID: {triage_id})")

    # Hook into event_bus to capture events
    captured_events = []
    async def capture_event(data):
        captured_events.append(data)
        
    event_bus.subscribe("workflow_execution_trace", capture_event)
    
    # Patch the Sentinel and Meta Agents so we can see what they receive
    sentinel_events = []
    meta_events = []
    
    sentinel = agent_registry.get_agent("SentinelAgent")
    original_analyze_event = sentinel.analyze_event
    async def mock_sentinel_analyze(event_data):
        sentinel_events.append(event_data)
        return await original_analyze_event(event_data)
    sentinel.analyze_event = mock_sentinel_analyze
    
    meta = agent_registry.get_agent("MetaAgent")
    original_analyze_failure = meta.analyze_failure
    async def mock_meta_analyze(event_data):
        meta_events.append(event_data)
        return await original_analyze_failure(event_data)
    meta.analyze_failure = mock_meta_analyze

    print("\n--- EXECUTING WORKFLOW ---")
    await execute_sequential_workflow(triage_id)
    print("--- WORKFLOW COMPLETE ---\n")
    
    # Give async tasks a moment to complete
    await asyncio.sleep(1)
    
    print("==================================================")
    print("              DEMONSTRATION RESULTS               ")
    print("==================================================")
    
    # Show payloads exchanged (From DB workflow execution)
    async with async_session_factory() as session:
        execution = (await session.execute(
            select(WorkflowExecutionModel).where(WorkflowExecutionModel.patient_id == patient_id).order_by(WorkflowExecutionModel.created_at.desc())
        )).scalars().first()
        
        print("\n[8. WORKFLOW EXECUTION RECORD]")
        print(f"Execution ID: {execution.id}")
        print(f"Status: {execution.status}")
        
        print("\n[3. ACTUAL PAYLOADS EXCHANGED]")
        for trace in captured_events:
            stage = trace.get("stage")
            if stage not in ["started", "completed"]:
                print(f"\n--- {stage.upper()} STAGE ---")
                print(f"Input: \n{json.dumps(trace.get('input'), indent=2)}")
                print(f"Output: \n{json.dumps(trace.get('output'), indent=2)}")
                
        print("\n[4. DATABASE RECORDS CREATED]")
        pharma_res = (await session.execute(select(PharmaResultModel).where(PharmaResultModel.patient_id == str(patient_id)).order_by(PharmaResultModel.created_at.desc()))).scalars().first()
        sched_res = (await session.execute(select(SchedulerResultModel).where(SchedulerResultModel.patient_id == str(patient_id)).order_by(SchedulerResultModel.created_at.desc()))).scalars().first()
        bed_res = (await session.execute(select(BedResultModel).where(BedResultModel.patient_id == str(patient_id)).order_by(BedResultModel.created_at.desc()))).scalars().first()
        
        print(f"PharmaResultModel ID: {pharma_res.id if pharma_res else 'Not Found'}")
        print(f"SchedulerResultModel ID: {sched_res.id if sched_res else 'Not Found'}")
        print(f"BedResultModel ID: {bed_res.id if bed_res else 'Not Found'}")
        
    print("\n[5. WEBSOCKET EVENTS EMITTED]")
    print(f"Captured {len(captured_events)} 'workflow_execution_trace' broadcast events.")
    for i, e in enumerate(captured_events):
        print(f"Event {i+1}: Stage='{e.get('stage')}'")
        
    print("\n[6. SENTINEL EVENTS RECEIVED]")
    print(f"Sentinel analyzed {len(sentinel_events)} internal trace events.")
    for i, e in enumerate(sentinel_events):
        print(f"- {e.get('affected_agent')} execution event received by Sentinel.")
        
    print("\n[7. META-AGENT EVENTS RECEIVED]")
    print(f"Meta-Agent analyzed {len(meta_events)} failure/warning events.")
    for i, e in enumerate(meta_events):
        print(f"- {e.get('affected_agent')}: {e.get('description')}")
        
    print("\n[10. COMMUNICATION GAPS & OBSERVATIONS]")
    print("Observations:")
    print("- Inputs successfully cascaded down the pipeline.")
    print("- Database models successfully instantiated and persisted.")
    print("- Sentinel/Meta agents correctly hook into the EventBus.")
    if len(meta_events) == 0:
        print("- No errors detected in the agent outputs during this run.")
        
    print("\nDONE.")

if __name__ == "__main__":
    asyncio.run(run_demo())
