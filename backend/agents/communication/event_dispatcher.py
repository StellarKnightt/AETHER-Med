"""
Event Dispatcher
================
Dispatches agent-generated events to listeners and external sinks.
"""

import asyncio
from typing import Dict, List, Callable
from backend.agents.communication.schemas import AgentEvent
from backend.utils.logger import app_logger

class EventDispatcher:
    """Centralized dispatcher for system events."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EventDispatcher, cls).__new__(cls)
            cls._instance.listeners: Dict[str, List[Callable]] = {}
        return cls._instance

    async def dispatch(self, event: AgentEvent):
        """Dispatch an event to all interested listeners."""
        app_logger.debug(f"Event: {event.sender} emitted {event.event_type}")
        
        # Notify specific event type listeners
        if event.event_type in self.listeners:
            for callback in self.listeners[event.event_type]:
                asyncio.create_task(callback(event))
        
        # Notify global listeners
        if "*" in self.listeners:
            for callback in self.listeners["*"]:
                asyncio.create_task(callback(event))

    def add_listener(self, event_type: str, callback: Callable):
        """Listen for a specific event type or '*' for all."""
        if event_type not in self.listeners:
            self.listeners[event_type] = []
        self.listeners[event_type].append(callback)

event_dispatcher = EventDispatcher()
