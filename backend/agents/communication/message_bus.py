"""
Message Bus
===========
In-memory message bus for high-speed agent-to-agent communication.
"""

import asyncio
from typing import Dict, List, Callable, Any
from backend.agents.communication.schemas import AgentMessage
from backend.utils.logger import app_logger

class MessageBus:
    """Singleton message bus for internal agent communication."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MessageBus, cls).__new__(cls)
            cls._instance.subscribers: Dict[str, List[Callable]] = {}
        return cls._instance

    async def publish(self, message: AgentMessage):
        """Publish a message to the bus."""
        app_logger.debug(f"Bus: {message.sender} -> {message.receiver} [{message.message_type}]")
        
        # Notify specific receiver
        if message.receiver in self.subscribers:
            for callback in self.subscribers[message.receiver]:
                asyncio.create_task(callback(message))
        
        # Notify global listeners (e.g., telemetry, meta-agent)
        if "*" in self.subscribers:
            for callback in self.subscribers["*"]:
                asyncio.create_task(callback(message))

    def subscribe(self, agent_name: str, callback: Callable):
        """Subscribe to messages for a specific agent name or '*' for all."""
        if agent_name not in self.subscribers:
            self.subscribers[agent_name] = []
        self.subscribers[agent_name].append(callback)

message_bus = MessageBus()
