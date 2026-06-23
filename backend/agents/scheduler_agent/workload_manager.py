"""
Workload Manager
================
Simulates hospital workload and capacity tracking.
"""

import random
from typing import Dict

class WorkloadManager:
    @staticmethod
    def get_current_workload() -> Dict[str, int]:
        """Mock current hospital workload."""
        return {
            "available_doctors": random.randint(2, 10),
            "available_nurses": random.randint(5, 20),
            "active_emergencies": random.randint(0, 3),
            "icu_occupancy": random.randint(50, 95), # percentage
            "ward_occupancy": random.randint(60, 90) # percentage
        }
