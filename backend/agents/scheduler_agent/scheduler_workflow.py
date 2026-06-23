"""
Scheduler Workflow
==================
Main flow coordinating the context, LLM, rules, and dispatch logic.
"""

from typing import Dict, Any
from langchain_core.language_models import BaseChatModel

from backend.agents.scheduler_agent.scheduler_context_builder import SchedulerContextBuilder
from backend.agents.scheduler_agent.workload_manager import WorkloadManager
from backend.agents.scheduler_agent.staffing_manager import StaffingManager
from backend.agents.scheduler_agent.emergency_dispatch import EmergencyDispatch
from backend.agents.scheduler_agent.scheduler_engine import SchedulerEngine
from backend.agents.scheduler_agent.scheduler_rules import SchedulerRules
from backend.agents.scheduler_agent.scheduler_optimizer import SchedulerOptimizer

async def run_scheduler_workflow(llm: BaseChatModel, patient_data: Dict[str, Any], staff_data: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the full scheduling workflow for a patient."""
    
    # 1. Gather context
    context_str = SchedulerContextBuilder.build_context(patient_data, staff_data)
    
    # 2. Call LLM
    llm_output = await SchedulerEngine.run_llm_analysis(llm, context_str)
    
    # 3. Apply Business Rules for Emergency Escalation
    ruled_output = SchedulerRules.apply_rules(patient_data, llm_output)
    
    is_urgent = ruled_output.get("priority_level") in ["CRITICAL_PRIORITY", "EMERGENCY_RESPONSE"]
    
    if is_urgent and "Activate Emergency Team" not in ruled_output.get("workflow_actions", []):
         ruled_output["workflow_actions"].append("Activate Emergency Team")
         
    return ruled_output
