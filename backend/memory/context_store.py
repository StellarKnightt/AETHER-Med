"""
Context Store
==============
In-memory context storage for agent conversations and workflow state.
Phase 1: Simple dict-based store.
Phase 2+: Redis/persistent storage with TTL and namespacing.
"""

from typing import Any, Dict, Optional
from datetime import datetime, timezone

from backend.utils.logger import get_logger

logger = get_logger("memory.context_store")


class ContextStore:
    """
    Stores agent and workflow context for cross-agent communication.

    Phase 1: In-memory dictionary.
    Phase 2+: Will be backed by Redis or a persistent store.
    """

    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}
        logger.info("Context store initialized (in-memory)")

    def set(self, key: str, value: Any, namespace: str = "default") -> None:
        """Store a value with a namespaced key."""
        full_key = f"{namespace}:{key}"
        self._store[full_key] = {
            "value": value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "namespace": namespace,
        }
        logger.debug(f"Context set: {full_key}")

    def get(self, key: str, namespace: str = "default") -> Optional[Any]:
        """Retrieve a value by namespaced key."""
        full_key = f"{namespace}:{key}"
        entry = self._store.get(full_key)
        return entry["value"] if entry else None

    def get_namespace(self, namespace: str) -> Dict[str, Any]:
        """Get all entries in a namespace."""
        prefix = f"{namespace}:"
        return {
            k.removeprefix(prefix): v["value"]
            for k, v in self._store.items()
            if k.startswith(prefix)
        }

    def clear(self, namespace: Optional[str] = None) -> None:
        """Clear all entries or entries in a specific namespace."""
        if namespace:
            prefix = f"{namespace}:"
            self._store = {
                k: v for k, v in self._store.items() if not k.startswith(prefix)
            }
            logger.info(f"Cleared namespace: {namespace}")
        else:
            self._store.clear()
            logger.info("Cleared all context")


# Singleton instance
context_store = ContextStore()
