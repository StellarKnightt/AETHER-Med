"""
Event Types Configuration
=========================
Defines hospital-wide events that can be triggered in the simulation.
"""

EVENT_TYPES = [
    {
        "type": "surge",
        "severity": "high",
        "description": "Sudden influx of patients due to a local incident.",
        "probability": 0.05
    },
    {
        "type": "ambulance_arrival",
        "severity": "medium",
        "description": "Ambulance arriving with an emergency patient.",
        "probability": 0.15
    },
    {
        "type": "icu_overload",
        "severity": "critical",
        "description": "ICU capacity reached. Diverting critical patients.",
        "probability": 0.02
    },
    {
        "type": "staff_shortage",
        "severity": "medium",
        "description": "Night shift started, operating with reduced staff.",
        "probability": 0.10
    }
]
