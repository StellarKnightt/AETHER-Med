import time
import json
from backend.graph.state.workflow_state import WorkflowState
from backend.graph.utils.db_utils import update_workflow_stage, record_node_transition
from backend.utils.logger import get_logger

logger = get_logger("workflow.routing_node")

async def routing_node(state: WorkflowState) -> WorkflowState:
    """
    Routing Controller (Adaptive Routing Engine):
    Evaluates patient factors and calculates scores to dynamically route
    execution to the appropriate workflow path.
    """
    start_time = time.time()
    patient_id = state['patient_id']
    logger.info(f"RoutingNode started for patient {patient_id}")
    
    await update_workflow_stage(state["workflow_id"], "routing")
    
    approval_status = state.get("approval_status", "pending")
    if approval_status == "rejected":
        routing_decision = {
            "selected_route": "END",
            "reason": "Workflow was rejected by human operator.",
            "next_node": "END",
            "factors_evaluated": ["Human Approval = REJECTED"],
            "scorecard": {}
        }
        return {"routing_decision": routing_decision, "current_node": "routing"}

    # Extract data for evaluation
    triage_output = state.get("triage_output", {})
    priority = triage_output.get("priority", "MODERATE").upper()
    severity = triage_output.get("severity_score", 0.0)
    diseases = [d.lower() for d in triage_output.get("diseases", [])]
    symptoms = [s.lower() for s in triage_output.get("symptoms", [])]
    
    # Analyze text for routing flags
    all_text = " ".join(diseases + symptoms)
    
    is_critical_care = False
    is_medication_risk = False
    is_fast_track = False
    
    factors_evaluated = [
        f"Priority = {priority}",
        f"Severity Score = {severity}"
    ]
    
    # 1. Evaluate Critical Care
    critical_keywords = ['cardiac', 'respiratory failure', 'stroke', 'icu', 'heart attack', 'severe asthma', 'coronary artery', 'asthma']
    if priority == "CRITICAL" or any(kw in all_text for kw in critical_keywords) or severity > 0.8:
        is_critical_care = True
        factors_evaluated.append("Critical symptoms/diseases detected")
        factors_evaluated.append("Requires immediate ICU evaluation")
    
    # 2. Evaluate Medication Risk
    med_risk_keywords = ['allergy', 'oncology', 'chemotherapy', 'medication conflict', 'drug interaction', 'cancer']
    patient_allergies = state.get("patient_data", {}).get("allergies", [])
    if (any(kw in all_text for kw in med_risk_keywords) or len(patient_allergies) > 0) and not is_critical_care:
        is_medication_risk = True
        factors_evaluated.append("Allergy or complex medication history detected")
        factors_evaluated.append("Pharma review strictly required")
    
    # 3. Evaluate Fast Track
    if priority in ["LOW", "MODERATE"] and not is_critical_care and not is_medication_risk:
        is_fast_track = True
        factors_evaluated.append("Stable vitals")
        factors_evaluated.append("No medication conflicts")
    
    # Generate Route Decision
    if state.get("simulate_meta_recovery"):
        selected_route = "META_RECOVERY"
        next_node = "meta_node"
        reason = "System detected an agent failure. Initiating recovery."
        selected_path = "Routing Controller → Meta-Agent Recovery"
        confidence = "100%"
        factors_evaluated.append("Agent Failure Simulation Triggered")
        
    elif state.get("simulate_sentinel_intervention"):
        selected_route = "SENTINEL_INTERVENTION"
        next_node = "sentinel_node"
        reason = "Security violation or unauthorized access detected."
        selected_path = "Routing Controller → Sentinel Intervention"
        confidence = "100%"
        factors_evaluated.append("Security Policy Violation Detected")

    elif is_critical_care:
        selected_route = "CRITICAL_CARE"
        next_node = "pharma_node"
        reason = "Patient requires immediate intensive care monitoring and ICU evaluation."
        selected_path = "Triage → Routing → Pharma → Scheduler → Bed → ICU"
        confidence = f"{min(99, int(severity * 100 + 10))}%"
        
    elif is_medication_risk:
        selected_route = "MEDICATION_RISK"
        next_node = "pharma_node"
        reason = "Patient has severe allergy conflicts or complex medication requirements necessitating thorough pharma review."
        selected_path = "Triage → Routing → Pharma → Scheduler → Bed → Outcome"
        confidence = "94%"
        
    else:
        # Fast Track
        selected_route = "FAST_TRACK"
        next_node = "scheduler_node" # Skip Pharma
        reason = "Low-risk patient with stable vitals and no medication conflicts. Fast-tracking to scheduler."
        selected_path = "Triage → Routing → Scheduler → Bed → Outcome"
        confidence = "98%"

    # Generate Scorecard
    scorecard = {
        "Criticality Score": int(severity * 100),
        "Medication Risk Score": 85 if is_medication_risk else 15,
        "Resource Requirement Score": 90 if is_critical_care else 40,
        "Security Risk Score": 100 if selected_route == "SENTINEL_INTERVENTION" else 5
    }

    routing_decision = {
        "selected_route": selected_route,
        "reason": reason,
        "next_node": next_node,
        "selected_path": selected_path,
        "confidence": confidence,
        "factors_evaluated": factors_evaluated,
        "scorecard": scorecard
    }
    
    duration_ms = (time.time() - start_time) * 1000
    
    await record_node_transition(
        execution_id=state["workflow_id"],
        patient_id=patient_id,
        stage="routing",
        input_payload={"priority": priority, "diseases": diseases},
        output_payload=routing_decision,
        duration_ms=duration_ms
    )
    
    return {
        "routing_decision": routing_decision,
        "current_node": "routing"
    }
