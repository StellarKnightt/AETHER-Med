"""
Telemetry
=========
Tracks execution time, token usage, and provider telemetry.
"""

import time
from typing import Dict, Any, Optional

from backend.agents.logging.agent_logger import AgentLogger

class TelemetryTracker:
    """Tracks execution telemetry for an agent run."""
    
    def __init__(self, agent_name: str, logger: AgentLogger):
        self.agent_name = agent_name
        self.logger = logger
        self.start_time: float = 0.0
        self.end_time: float = 0.0
        self.token_usage: Dict[str, int] = {"prompt": 0, "completion": 0, "total": 0}
        self.provider: Optional[str] = None
        
    def start(self):
        self.start_time = time.time()
        
    def stop(self, provider: str, tokens: Dict[str, int]):
        self.end_time = time.time()
        self.provider = provider
        self.token_usage = tokens
        
        duration = self.end_time - self.start_time
        
        self.logger.info(
            f"Execution completed in {duration:.2f}s",
            duration=duration,
            provider=provider,
            tokens=tokens
        )
        
    def get_metrics(self) -> Dict[str, Any]:
        return {
            "duration_seconds": round(self.end_time - self.start_time, 2),
            "provider": self.provider,
            "token_usage": self.token_usage
        }
