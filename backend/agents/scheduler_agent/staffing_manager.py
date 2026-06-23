"""
Staffing Manager
================
Simulates and manages states of doctors and nurses.
"""

import random

class StaffingManager:
    def __init__(self):
        # Mock staff pools
        self.doctors = ["Dr. Smith (Cardiology)", "Dr. Jones (Neurology)", "Dr. Adams (ER)", "Dr. Lee (General)"]
        self.nurses = ["Nurse Jackie (ICU)", "Nurse Sarah (ER)", "Nurse Mike (Ward)", "Nurse Kelly (Triage)"]

    def get_available_doctor(self, is_emergency: bool = False) -> str:
        """Get an available doctor."""
        if is_emergency:
            return "Dr. Adams (ER)" # Emergency specialist
        return random.choice(self.doctors)

    def get_available_nurse(self, is_emergency: bool = False) -> str:
        """Get an available nurse."""
        if is_emergency:
            return "Nurse Sarah (ER)" # Emergency nurse
        return random.choice(self.nurses)
