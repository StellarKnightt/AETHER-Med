"""
Patient Profiles Configuration
==============================
Defines severity profiles for synthetic patients.
"""

from typing import Dict, Any

PATIENT_PROFILES = {
    "standard": {
        "probability": 0.60,
        "triage_level_range": (3, 5),
        "vitals_volatility": 0.05, # Low chance of sudden change
        "deterioration_probability": 0.01
    },
    "emergency": {
        "probability": 0.30,
        "triage_level_range": (2, 3),
        "vitals_volatility": 0.20,
        "deterioration_probability": 0.05
    },
    "critical": {
        "probability": 0.10,
        "triage_level_range": (1, 2),
        "vitals_volatility": 0.40,
        "deterioration_probability": 0.15
    }
}
