"""
Triage Metrics
==============
Tracks triage-specific metrics such as classification distribution and escalation rates.
"""

from typing import Dict, Any
from backend.utils.logger import app_logger

class TriageMetrics:
    """Tracks domain-specific metrics for the Triage Agent."""
    
    def __init__(self):
        self.total_triages = 0
        self.priority_distribution = {
            "LOW": 0,
            "MODERATE": 0,
            "HIGH": 0,
            "CRITICAL": 0
        }
        self.escalations = 0

    def record_triage(self, priority: str, escalation_required: bool):
        self.total_triages += 1
        if priority in self.priority_distribution:
            self.priority_distribution[priority] += 1
        if escalation_required:
            self.escalations += 1
            
        app_logger.info(f"Triage Metrics Update: {self.get_metrics()}")

    def get_metrics(self) -> Dict[str, Any]:
        return {
            "total_triages": self.total_triages,
            "priority_distribution": self.priority_distribution,
            "escalations": self.escalations,
            "escalation_rate": round(self.escalations / max(self.total_triages, 1), 2)
        }

# Global instance for tracking
triage_metrics = TriageMetrics()
