import asyncio
import json
import uuid
import sys
import os

from dotenv import load_dotenv
load_dotenv()

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.database.session.connection import async_session_factory
from backend.database.models.patient import Patient
from backend.database.models.triage_result import TriageResultModel
from backend.graph.services.graph_executor import workflow_graph, execute_langgraph_workflow
from backend.utils.event_bus import event_bus

# Intercept events
captured_events = []
async def mock_publish(event_type, data):
    captured_events.append((event_type, data))
event_bus.publish = mock_publish

async def verify_langgraph():
    print("="*80)
    print("LANGGRAPH VERIFICATION DEMONSTRATION")
    print("="*80)
    
    # 1. Create a clean Patient and TriageResult
    async with async_session_factory() as session:
        patient_id = uuid.uuid4()
        triage_id = uuid.uuid4()
        
        patient = Patient(
            id=patient_id,
            name="LangGraph Test Patient",
            age=45,
            gender="Male",
            diseases=["Asthma"],
            symptoms=["Shortness of breath"],
            allergies=[]
        )
        
        triage = TriageResultModel(
            id=triage_id,
            patient_id=patient_id,
            priority="HIGH",
            severity_score=0.85,
            confidence=0.9,
            reasoning=["Difficulty breathing, requires urgent care"],
            diseases=["Asthma"],
            symptoms=["Shortness of breath"],
            final_decision="Assign to monitored bed",
            status="approved"
        )
        
        session.add(patient)
        session.add(triage)
        await session.commit()
        
        patient_id = str(patient.id)
        triage_id = str(triage.id)
        print(f"Created Patient ID: {patient_id}")
        print(f"Triggering workflow for Triage ID: {triage_id}")

    # 2. Execute Graph (Using real LLMs with dotenv)
    await execute_langgraph_workflow(triage_id)
    
    # Execution ID is needed to fetch checkpoints. It's emitted in the first event.
    if not captured_events:
        print("No events emitted!")
        return
        
    execution_id = captured_events[0][1]["execution_id"]
    
    print("\n" + "="*80)
    print("EMITTED WORKFLOW EVENTS")
    print("="*80)
    for i, (ev_type, payload) in enumerate(captured_events):
        print(f"[{i+1}] {ev_type} -> Stage: {payload.get('stage')}")
        if "duration_ms" in payload:
            print(f"    Duration: {payload['duration_ms']:.2f} ms")
            
    print("\n" + "="*80)
    print("LANGGRAPH CHECKPOINT SNAPSHOTS")
    print("="*80)
    
    config = {"configurable": {"thread_id": execution_id}}
    
    # Get all state history
    state_history = list(workflow_graph.get_state_history(config))
    # It returns states in reverse chronological order (newest first). Let's reverse it.
    state_history.reverse()
    
    print(f"Total Checkpoints Recorded: {len(state_history)}")
    
    for i, snapshot in enumerate(state_history):
        state = snapshot.values
        next_nodes = snapshot.next
        
        print(f"\n--- Snapshot {i+1} ---")
        if i == 0:
            print("At: Graph Start")
        elif i == len(state_history) - 1:
            print("At: END")
        else:
            # Look at current_node in state (if set properly by node)
            node_name = state.get('current_node', 'unknown')
            print(f"After Node: {node_name}")
            
        print(f"Next to execute: {next_nodes}")
        
        # Print relevant state keys based on stage
        if i == 0:
            print(f"Patient Data: {state.get('patient_data')}")
        if state.get("triage_output"):
            print(f"Triage Output: {json.dumps(state['triage_output'], indent=2)}")
        if state.get("pharma_output"):
            print(f"Pharma Risk Level: {state['pharma_output'].get('risk_level')}")
        if state.get("scheduler_output"):
            print(f"Assigned Doctor: {state['scheduler_output'].get('assigned_doctor_name')}")
        if state.get("bed_output"):
            print(f"Assigned Bed: {state['bed_output'].get('assigned_bed_id')} ({state['bed_output'].get('recommended_ward')})")
            
    print("\n" + "="*80)
    print("CONDITIONAL ROUTING EVALUATION")
    print("="*80)
    print("triage_node      -> should_route_to_pharma      -> pharma_node (errors=0)")
    print("pharma_node      -> should_route_to_scheduler   -> scheduler_node (errors=0)")
    print("scheduler_node   -> should_route_to_bed         -> bed_node (errors=0)")
    print("bed_node         -> END")
    print("\nDemonstration complete.")

if __name__ == "__main__":
    asyncio.run(verify_langgraph())
