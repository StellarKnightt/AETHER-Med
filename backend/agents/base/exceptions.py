"""
Agent Framework Exceptions
==========================
Custom exception classes for agent-related errors.
"""

class AgentError(Exception):
    """Base class for all agent errors."""
    pass

class ProviderError(AgentError):
    """Raised when an LLM provider fails."""
    pass

class ValidationError(AgentError):
    """Raised when agent input or output fails validation."""
    pass

class ExecutionError(AgentError):
    """Raised when an agent execution fails."""
    pass

class ContextError(AgentError):
    """Raised when there is an issue with context retrieval or injection."""
    pass
