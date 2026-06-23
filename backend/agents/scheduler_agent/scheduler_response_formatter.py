"""
Scheduler Response Formatter
============================
Ensures LLM output is correctly formatted.
"""

from typing import Dict, Any

class SchedulerResponseFormatter:
    @staticmethod
    def format_response(raw_output: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and format the LLM output."""
        if "error" in raw_output:
            return {"error": raw_output["error"]}
            
        return {
            "priority_level": raw_output.get("priority_level", "NORMAL_PRIORITY"),
            "assigned_doctor_id": raw_output.get("assigned_doctor_id"),
            "assigned_nurse_id": raw_output.get("assigned_nurse_id"),
            "assigned_doctor_name": raw_output.get("assigned_doctor_name", "Pending Assignment"),
            "assigned_nurse_name": raw_output.get("assigned_nurse_name", "Pending Assignment"),
            "workflow_actions": raw_output.get("workflow_actions", []),
            "reasoning_chain": raw_output.get("reasoning_chain", ["Standard scheduling applied."]),
            "confidence": float(raw_output.get("confidence", 0.5))
        }
