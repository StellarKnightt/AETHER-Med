"""
WebSocket Connection Handler
==============================
Manages WebSocket connections for real-time dashboard updates.
Supports broadcasting agent events, vitals streams, and workflow status.
"""

import json
from typing import Dict, Set

from fastapi import WebSocket, WebSocketDisconnect

from backend.utils.logger import get_logger

logger = get_logger("websocket")


class ConnectionManager:
    """
    Manages active WebSocket connections.
    Supports room-based subscriptions for targeted broadcasting.
    """

    def __init__(self):
        # All active connections
        self._active_connections: Set[WebSocket] = set()
        # Room-based connections (e.g., "agents", "vitals", "workflow")
        self._rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room: str = "general"):
        """Accept a new WebSocket connection and add to a room."""
        await websocket.accept()
        self._active_connections.add(websocket)

        if room not in self._rooms:
            self._rooms[room] = set()
        self._rooms[room].add(websocket)

        logger.info(f"WebSocket connected to room '{room}'. Total connections: {len(self._active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection from all rooms."""
        self._active_connections.discard(websocket)
        for room in self._rooms.values():
            room.discard(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self._active_connections)}")

    async def send_personal(self, websocket: WebSocket, data: dict):
        """Send data to a specific client."""
        await websocket.send_json(data)

    async def broadcast(self, data: dict, room: str | None = None):
        """
        Broadcast data to all connected clients, or to a specific room.
        Disconnected clients are automatically cleaned up.
        """
        targets = self._rooms.get(room, self._active_connections) if room else self._active_connections
        disconnected = set()

        for connection in targets:
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.add(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

    @property
    def active_count(self) -> int:
        """Number of active connections."""
        return len(self._active_connections)


# Singleton connection manager
ws_manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint handler.
    Clients can subscribe to rooms by sending: {"action": "subscribe", "room": "agents"}
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                action = message.get("action", "")

                if action == "subscribe":
                    room = message.get("room", "general")
                    if room not in ws_manager._rooms:
                        ws_manager._rooms[room] = set()
                    ws_manager._rooms[room].add(websocket)
                    await ws_manager.send_personal(
                        websocket,
                        {"type": "subscribed", "room": room},
                    )
                elif action == "ping":
                    await ws_manager.send_personal(
                        websocket,
                        {"type": "pong"},
                    )
                else:
                    # Echo back for now — Phase 2 will route to agents
                    await ws_manager.send_personal(
                        websocket,
                        {"type": "echo", "data": message},
                    )
            except json.JSONDecodeError:
                await ws_manager.send_personal(
                    websocket,
                    {"type": "error", "message": "Invalid JSON"},
                )
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
