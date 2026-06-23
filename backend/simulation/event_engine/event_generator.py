"""
Event Generator
===============
Randomly generates hospital-wide events to stress-test the system.
"""

import asyncio
import random
from typing import Dict, Any, List
from backend.simulation.event_engine.event_types import EVENT_TYPES
from backend.utils.logger import get_logger
import uuid
from datetime import datetime, timezone

logger = get_logger("simulation.event_engine.generator")

class EventGenerator:
    """Background task to generate hospital events."""

    def __init__(self):
        self.is_running = False
        self.subscribers = []

    def subscribe(self, callback):
        self.subscribers.append(callback)

    async def start(self, check_interval: float = 10.0):
        if self.is_running:
            return
            
        self.is_running = True
        logger.info("Event Generator started.")
        
        while self.is_running:
            await asyncio.sleep(check_interval)
            await self._check_events()

    def stop(self):
        self.is_running = False
        logger.info("Event Generator stopped.")

    async def _check_events(self):
        """Check probabilties and fire events if needed."""
        for event_config in EVENT_TYPES:
            if random.random() < event_config["probability"]:
                event_data = {
                    "id": str(uuid.uuid4()),
                    "event_type": event_config["type"],
                    "severity": event_config["severity"],
                    "description": event_config["description"],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                logger.warning(f"🚨 HOSPITAL EVENT TRIGGERED: {event_data['event_type']} ({event_data['severity']})")
                
                # Notify subscribers
                message = {
                    "type": "event_update",
                    "event": event_data
                }
                for callback in self.subscribers:
                    try:
                        await callback(message)
                    except Exception as e:
                        logger.error(f"Error in event callback: {e}")
                
                # Only fire one event per interval to avoid spam
                break
