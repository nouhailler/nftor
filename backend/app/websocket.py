from __future__ import annotations

from fastapi import WebSocket

from app.models import SnapshotMessage


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, token: str | None = None) -> None:
        # Token is intentionally unused for now and reserved for future auth.
        _ = token
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def send_snapshot(self, websocket: WebSocket, snapshot: SnapshotMessage) -> None:
        await websocket.send_json(snapshot.model_dump(mode="json"))

    async def broadcast(self, snapshot: SnapshotMessage) -> None:
        disconnected: list[WebSocket] = []
        for websocket in self._connections:
            try:
                await self.send_snapshot(websocket, snapshot)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(websocket)
