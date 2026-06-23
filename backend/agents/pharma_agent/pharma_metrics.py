"""
Pharma Metrics
==============
Telemetry for the Pharma Agent.
"""
from typing import Dict, Any

class PharmaMetrics:
    def __init__(self):
        self.total_analyzed = 0
        self.critical_risks = 0
        self.high_risks = 0
        self.interactions_detected = 0

    def record_analysis(self, risk_level: str, interactions_count: int):
        self.total_analyzed += 1
        if risk_level == "CRITICAL_RISK":
            self.critical_risks += 1
        elif risk_level == "HIGH_RISK":
            self.high_risks += 1
        self.interactions_detected += interactions_count

    def get_metrics(self) -> Dict[str, Any]:
        return {
            "total_analyzed": self.total_analyzed,
            "critical_risks": self.critical_risks,
            "high_risks": self.high_risks,
            "interactions_detected": self.interactions_detected
        }

pharma_metrics = PharmaMetrics()
