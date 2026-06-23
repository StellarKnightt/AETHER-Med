"""
WebSocket Stream Broadcaster
============================
Broadcasts vitals + events to connected WebSocket clients.
Unified broadcaster used by both the simulation engine and event generator.
"""

from typing import Dict, Any, List
from fastapi import WebSocket
from backend.utils.logger import get_logger

logger = get_logger("simulation.vitals_stream.websocket")


class WebSocketBroadcaster:
    """Manages active websockets and broadcasts updates."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)

        # Clean up dead connections
        for conn in disconnected:
            self.disconnect(conn)


# Singleton — shared across simulation engine and event generator
broadcaster = WebSocketBroadcaster()


async def vitals_tick_callback(update: Dict[str, Any]):
    """Called by VitalsStreamEngine on each patient vitals tick.
    Emits 'vitals_update' message matching what VitalsMonitor.tsx expects.
    """
    message = {
        "type": "vitals_update",
        "data": update   # { patient_id, vitals }
    }
    await broadcaster.broadcast(message)


async def event_broadcast_callback(message: Dict[str, Any]):
    """Called by EventGenerator when a hospital event fires.
    Emits 'event_update' message matching what EventFeed.tsx expects.
    message already has shape: { type: 'event_update', event: {...} }
    """
    await broadcaster.broadcast(message)
