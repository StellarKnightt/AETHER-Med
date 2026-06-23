"""
Emergency Cases Configuration
=============================
Pre-defined emergency cases to inject into the simulation.
"""

EMERGENCY_CASES = [
    {
        "name": "Cardiac Arrest",
        "triage_level": 1,
        "vitals_override": {
            "heart_rate": (0, 30),
            "oxygen_saturation": (60, 80),
            "systolic_bp": (40, 70),
            "diastolic_bp": (20, 40),
            "respiratory_rate": (0, 8)
        },
        "description": "Patient is in cardiac arrest. Requires immediate resuscitation."
    },
    {
        "name": "Severe Anaphylaxis",
        "triage_level": 1,
        "vitals_override": {
            "heart_rate": (120, 150),
            "oxygen_saturation": (85, 92),
            "systolic_bp": (70, 90),
            "respiratory_rate": (25, 35)
        },
        "description": "Patient experiencing severe allergic reaction with respiratory distress."
    },
    {
        "name": "Massive Hemorrhage",
        "triage_level": 1,
        "vitals_override": {
            "heart_rate": (130, 160),
            "systolic_bp": (60, 80),
            "diastolic_bp": (30, 50),
            "respiratory_rate": (22, 30)
        },
        "description": "Patient presenting with massive internal bleeding."
    }
]
