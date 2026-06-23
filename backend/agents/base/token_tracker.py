"""
Token Tracker
=============
Tracks token usage and cost for cloud LLM requests.
"""

from typing import Dict, Any

class TokenTracker:
    """Tracks and budgets token usage per agent/request."""
    
    def __init__(self, budget: int = 100000):
        self.budget = budget
        self.total_tokens_used = 0
        self.usage_history = []

    def track_usage(self, prompt_tokens: int, completion_tokens: int):
        """Record usage from a single request."""
        total = prompt_tokens + completion_tokens
        self.total_tokens_used += total
        self.usage_history.append({
            "prompt": prompt_tokens,
            "completion": completion_tokens,
            "total": total
        })

    def is_over_budget(self) -> bool:
        """Check if the total usage exceeds the allocated budget."""
        return self.total_tokens_used >= self.budget
