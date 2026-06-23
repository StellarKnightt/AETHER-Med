"""
Agent Logger
============
Enhanced Loguru wrappers for agent-specific logging.
"""

from typing import Any, Dict
from loguru import logger

class AgentLogger:
    """Wrapper around loguru to standardize agent logs."""
    
    def __init__(self, agent_name: str, role: str):
        self.agent_name = agent_name
        self.role = role
        self.logger = logger.bind(agent=agent_name, role=role)

    def info(self, msg: str, **kwargs: Any) -> None:
        self.logger.info(msg, **kwargs)

    def error(self, msg: str, **kwargs: Any) -> None:
        self.logger.error(msg, **kwargs)

    def warning(self, msg: str, **kwargs: Any) -> None:
        self.logger.warning(msg, **kwargs)

    def debug(self, msg: str, **kwargs: Any) -> None:
        self.logger.debug(msg, **kwargs)
        
    def exception(self, msg: str, **kwargs: Any) -> None:
        self.logger.exception(msg, **kwargs)
