"""
Shared Enumerations
===================
Standardized enums for the Agent Framework.
"""

from enum import Enum, auto

class LLMProvider(str, Enum):
    GROQ = "groq"
    OPENROUTER = "openrouter"
    OPENAI = "openai"

class AgentRole(str, Enum):
    TRIAGE = "triage"
    PHARMA = "pharma"
    SCHEDULER = "scheduler"
    BED_MANAGER = "bed_manager"
    SENTINEL = "sentinel"
    META_ORCHESTRATOR = "meta_orchestrator"

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"

class PriorityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    ROUTINE = "routine"
