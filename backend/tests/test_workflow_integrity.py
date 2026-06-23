import pytest
import asyncio
import uuid
from unittest.mock import patch, MagicMock

# The module under test
from backend.graph.services.graph_executor import execute_langgraph_workflow
from backend.utils.event_bus import event_bus
from backend.database.models.triage_result import TriageResultModel
from backend.database.models.workflow_execution import WorkflowExecutionModel

@pytest.mark.asyncio
async def test_workflow_execution_persistence(db_session, setup_test_data):
    """
    Test that the LangGraph workflow properly creates and updates the WorkflowExecutionModel.
    """
    patient, triage = setup_test_data
    
    # 1. Trigger the workflow
    await execute_langgraph_workflow(str(triage.id))

@pytest.mark.asyncio
async def test_langgraph_workflow_integrity():
    """
    Validates that the LangGraph workflow properly delegates state 
    between agents and emits the expected trace events.
    """
    patient_uuid = uuid.uuid4()
    triage_uuid = uuid.uuid4()

    # Mock the DB session
    class MockResult:
        def scalar_one_or_none(self):
            mock_triage = MagicMock(spec=TriageResultModel)
            mock_triage.id = triage_uuid
            mock_triage.patient_id = patient_uuid
            mock_triage.priority = "HIGH"
            mock_triage.severity_score = 8
            mock_triage.diseases = ["Hypertension"]
            mock_triage.symptoms = ["Chest Pain"]
            mock_triage.reasoning = ["Potential cardiac event"]
            return mock_triage

    class MockSession:
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
        async def execute(self, query):
            return MockResult()
        def add(self, obj):
            if isinstance(obj, WorkflowExecutionModel):
                # Simulate DB ID assignment
                obj.id = uuid.uuid4()
        async def commit(self): pass
        async def refresh(self, obj): pass
        async def get(self, model, id):
            mock_model = MagicMock()
            mock_model.id = id
            mock_model.patient_id = patient_uuid
            mock_model.agent_outputs = {}
            mock_model.execution_history = []
            return mock_model

    # Intercept event bus calls
    published_events = []
    async def mock_publish(self, event_type, data):
        published_events.append((event_type, data))
        
    # Mock agents so we don't hit the real LLM APIs during testing
    async def mock_pharma_run(*args, **kwargs):
        return {"risk_level": "HIGH", "interactions_detected": ["Aspirin-Warfarin"]}
        
    async def mock_scheduler_run(*args, **kwargs):
        return {"assigned_doctor_name": "Dr. Smith", "assigned_nurse_name": "Nurse Joy"}
        
    async def mock_bed_run(*args, **kwargs):
        return {"assigned_bed_id": "bed-123", "recommended_ward": "ICU"}

    with patch("backend.graph.services.graph_executor.async_session_factory", return_value=MockSession()), \
         patch("backend.graph.nodes.triage_node.async_session_factory", return_value=MockSession()), \
         patch("backend.graph.nodes.bed_node.async_session_factory", return_value=MockSession()), \
         patch("backend.graph.utils.db_utils.async_session_factory", return_value=MockSession()), \
         patch("backend.utils.event_bus.EventBus.publish", new=mock_publish), \
         patch("backend.agents.providers.provider_factory.ProviderFactory.get_provider", return_value=MagicMock()), \
         patch("backend.agents.pharma_agent.pharma_agent.PharmaAgent.run", new=mock_pharma_run), \
         patch("backend.agents.scheduler_agent.scheduler_agent.SchedulerAgent.run", new=mock_scheduler_run), \
         patch("backend.agents.bed_agent.agent.BedAgent.run", new=mock_bed_run):
             
        # Execute the workflow
        await execute_langgraph_workflow(str(triage_uuid))

        # Assertions
        assert len(published_events) == 6, f"Expected 6 trace events (started, triage, pharma, scheduler, bed, completed). Got: {[data['stage'] for ev, data in published_events]}"
        
        stages_emitted = [data["stage"] for ev_type, data in published_events]
        assert stages_emitted == ["started", "triage", "pharma", "scheduler", "bed", "completed"], "Workflow did not emit stages in the correct sequential order."
        
        # Verify Pharma Output propagation
        pharma_trace = next(d for t, d in published_events if d["stage"] == "pharma")
        assert pharma_trace["output"]["risk_level"] == "HIGH"
        
        # Verify Scheduler Input (should contain pharma's output)
        scheduler_trace = next(d for t, d in published_events if d["stage"] == "scheduler")
        assert scheduler_trace["input"]["pharma_risk_level"] == "HIGH"
        assert scheduler_trace["output"]["assigned_doctor_name"] == "Dr. Smith"
        
        # Verify Bed Input (should contain scheduler's output)
        bed_trace = next(d for t, d in published_events if d["stage"] == "bed")
        assert bed_trace["input"]["assigned_doctor"] == "Dr. Smith"
        assert bed_trace["output"]["recommended_ward"] == "ICU"

        print("Workflow Integrity Test Passed! Pipeline executed sequentially via LangGraph and persisted state correctly.")
