import time
from backend.graph.state.workflow_state import WorkflowState
from backend.graph.utils.db_utils import update_workflow_stage, record_node_transition
from backend.utils.logger import get_logger

logger = get_logger("workflow.outcome_node")

async def outcome_node(state: WorkflowState) -> WorkflowState:
    """
    Outcome Node:
    Aggregates the execution results of the MAS workflow and produces a final Patient Outcome Report.
    """
    start_time = time.time()
    patient_id = state['patient_id']
    logger.info(f"OutcomeNode started for patient {patient_id}")
    
    await update_workflow_stage(state["workflow_id"], "outcome")
    
    triage = state.get("triage_output", {})
    pharma = state.get("pharma_output", {})
    scheduler = state.get("scheduler_output", {})
    bed = state.get("bed_output", {})
    
    outcome_report = {
        "triage": {
            "priority": triage.get("priority", "UNKNOWN"),
            "severity_score": triage.get("severity_score", 0),
        },
        "pharma": {
            "risk_level": pharma.get("risk_level", "UNKNOWN"),
            "conflicts_detected": pharma.get("interactions_detected") or pharma.get("conflicts_detected") or [],
        },
        "scheduler": {
            "assigned_doctor": scheduler.get("assigned_doctor_name") or scheduler.get("assigned_doctor"),
            "assigned_nurse": scheduler.get("assigned_nurse_name") or scheduler.get("assigned_nurse"),
        },
        "bed": {
            "assigned_bed": bed.get("assigned_bed_number") or bed.get("assigned_bed"),
            "ward": bed.get("recommended_ward") or bed.get("ward"),
        },
        "workflow": {
            "status": state.get("workflow_status", "completed"),
            "errors": state.get("errors", []),
            "approval_status": state.get("approval_status", "approved")
        },
        "final_status": "Success" if not state.get("errors") else "Failed"
    }
    
    duration_ms = (time.time() - start_time) * 1000
    
    await record_node_transition(
        execution_id=state["workflow_id"],
        patient_id=patient_id,
        stage="outcome",
        input_payload={"status": "aggregating"},
        output_payload=outcome_report,
        duration_ms=duration_ms
    )
    
    return {
        "outcome_report": outcome_report,
        "current_node": "outcome",
        "workflow_status": "completed"
    }
