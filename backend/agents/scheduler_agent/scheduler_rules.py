"""
Scheduler Rules
===============
Hardcoded business rules for priority assignment to supplement LLM logic.
"""

from typing import Dict, Any

class SchedulerRules:
    @staticmethod
    def apply_rules(patient_data: Dict[str, Any], llm_output: Dict[str, Any]) -> Dict[str, Any]:
        """Apply hardcoded safety and compliance rules over the LLM output."""
        triage_priority = patient_data.get("triage_priority", "MODERATE")
        
        # Override if LLM missed critical urgency or hit rate limit
        if triage_priority in ["CRITICAL", "HIGH"] and llm_output.get("priority_level") not in ["CRITICAL_PRIORITY", "HIGH_PRIORITY", "EMERGENCY_RESPONSE"]:
            llm_output["priority_level"] = "CRITICAL_PRIORITY" if triage_priority == "CRITICAL" else "HIGH_PRIORITY"
            if "reasoning_chain" in llm_output and isinstance(llm_output["reasoning_chain"], list):
                llm_output["reasoning_chain"].append("Rule Override: Triage priority mandates high priority level.")
            
        return llm_output
