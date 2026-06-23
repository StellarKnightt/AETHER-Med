"""
Vitals Ranges Configuration
===========================
Defines the normal, warning, and critical ranges for different patient vitals.
"""

from typing import Dict, Tuple

# Format: (Min, Max)
VITALS_RANGES = {
    "heart_rate": {
        "normal": (60, 100),
        "warning": (50, 120),
        "critical": (40, 140)
    },
    "systolic_bp": {
        "normal": (90, 120),
        "warning": (80, 140),
        "critical": (70, 180)
    },
    "diastolic_bp": {
        "normal": (60, 80),
        "warning": (50, 90),
        "critical": (40, 110)
    },
    "oxygen_saturation": {
        "normal": (95, 100),
        "warning": (90, 94),
        "critical": (80, 89)
    },
    "respiratory_rate": {
        "normal": (12, 20),
        "warning": (10, 24),
        "critical": (8, 30)
    },
    "temperature": {
        "normal": (36.5, 37.5),
        "warning": (36.0, 38.5),
        "critical": (35.0, 40.0)
    }
}
