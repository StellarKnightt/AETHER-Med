"""
Scheduler Explainer
===================
Generates plain English explanations for scheduling decisions.
"""

from typing import List

class SchedulerExplainer:
    @staticmethod
    def format_reasoning(reasons: List[str]) -> str:
        """Format reasoning list into a cohesive paragraph."""
        if not reasons:
            return "Standard scheduling protocol followed."
        return " ".join(reasons)
