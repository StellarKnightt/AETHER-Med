"""
Triage Configuration
====================
Constants, thresholds, and clinical priority definitions.
"""

from enum import Enum
from typing import Dict, Any

class TriagePriority(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

# Clinical thresholds for rule-based escalation
CLINICAL_THRESHOLDS = {
    "hr": {"low_critical": 40, "high_critical": 130, "high_warning": 100},
    "spo2": {"critical": 90, "warning": 94},
    "rr": {"low_critical": 10, "high_critical": 30, "high_warning": 24},
    "sbp": {"low_critical": 90, "high_critical": 200, "high_warning": 160},
}

# High-risk symptoms that automatically flag for HIGH or CRITICAL
CRITICAL_SYMPTOMS = [
    "chest pain",
    "stroke",
    "cardiac arrest",
    "unconscious",
    "severe bleeding",
    "cyanosis"
]

HIGH_RISK_SYMPTOMS = [
    "fracture",
    "breathing difficulty",
    "severe pain",
    "confusion",
    "high fever"
]
