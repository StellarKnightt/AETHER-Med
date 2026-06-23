"""
Scheduler Metrics
=================
Tracks latency and utilization metrics for the Scheduler Agent.
"""

import time
from typing import Dict, Any

class SchedulerMetrics:
    def __init__(self):
        self.total_processed = 0
        self.emergency_dispatches = 0
        self.average_latency_ms = 0.0

    def record_run(self, latency_ms: float, priority_level: str):
        self.total_processed += 1
        if priority_level in ["CRITICAL_PRIORITY", "EMERGENCY_RESPONSE"]:
            self.emergency_dispatches += 1
        
        # Exponential moving average for latency
        if self.average_latency_ms == 0.0:
            self.average_latency_ms = latency_ms
        else:
            self.average_latency_ms = (self.average_latency_ms * 0.9) + (latency_ms * 0.1)

    def get_metrics(self) -> Dict[str, Any]:
        return {
            "total_processed": self.total_processed,
            "emergency_dispatches": self.emergency_dispatches,
            "average_latency_ms": round(self.average_latency_ms, 2)
        }

scheduler_metrics = SchedulerMetrics()
