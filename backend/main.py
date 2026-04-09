from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import HistoryDatabase
from app.monitor import NftMonitorService
from app.models import HistoryResponse
from app.websocket import ConnectionManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    database = HistoryDatabase("nft_monitor.db")
    websocket_manager = ConnectionManager()
    monitor = NftMonitorService(
        database=database,
        websocket_manager=websocket_manager,
        poll_interval_seconds=1.5,
    )

    await database.start()
    await monitor.start()

    app.state.database = database
    app.state.monitor = monitor
    app.state.websocket_manager = websocket_manager

    try:
        yield
    finally:
        await monitor.stop()
        await database.stop()


app = FastAPI(
    title="nft-monitor",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/history", response_model=HistoryResponse)
async def get_history(hours: int = Query(default=1, ge=1, le=168)) -> HistoryResponse:
    database: HistoryDatabase = app.state.database
    return await database.get_history(hours=hours)


@app.websocket("/ws/nft")
async def websocket_nft(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    manager: ConnectionManager = app.state.websocket_manager
    await manager.connect(websocket=websocket, token=token)
    monitor: NftMonitorService = app.state.monitor

    latest_snapshot = monitor.latest_snapshot
    if latest_snapshot is not None:
        await manager.send_snapshot(websocket, latest_snapshot)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
