import asyncio
from typing import Callable, Dict, List, Any
from backend.utils.logger import get_logger

logger = get_logger("event_bus")

class EventBus:
    """Simple internal pub/sub event bus for the AETHER-Med backend."""
    
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, callback: Callable):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)
        logger.debug(f"Subscribed to {event_type}")

    async def publish(self, event_type: str, data: Any):
        """Publish event and trigger callbacks asynchronously without blocking."""
        from backend.api.websocket.handler import ws_manager
        from backend.simulation.vitals_stream.websocket_stream import broadcaster
        
        # Always broadcast to websockets
        ws_payload = {"type": event_type, "data": data}
        asyncio.create_task(ws_manager.broadcast(ws_payload))
        asyncio.create_task(broadcaster.broadcast(ws_payload))
        
        if event_type in self.subscribers:
            for callback in self.subscribers[event_type]:
                try:
                    # Run callback in background
                    asyncio.create_task(self._safe_execute(callback, data))
                except Exception as e:
                    logger.error(f"Failed to schedule callback for {event_type}: {e}")
                    
    async def _safe_execute(self, callback, data):
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(data)
            else:
                callback(data)
        except Exception as e:
            logger.error(f"EventBus callback error: {e}")

# Global singleton
event_bus = EventBus()
