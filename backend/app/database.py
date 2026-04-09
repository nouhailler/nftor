from __future__ import annotations

import asyncio
import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.models import ChainStats, HistoryPoint, HistoryResponse, SnapshotMessage


class HistoryDatabase:
    def __init__(
        self,
        database_path: str,
        flush_interval_seconds: float = 5.0,
        batch_size: int = 10,
    ) -> None:
        self._database_path = Path(database_path)
        self._flush_interval_seconds = flush_interval_seconds
        self._batch_size = batch_size
        self._pending: list[tuple[str, str, int, int, float, float]] = []
        self._lock = asyncio.Lock()
        self._stop_event = asyncio.Event()
        self._flush_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        await asyncio.to_thread(self._initialize)
        self._flush_task = asyncio.create_task(self._flush_worker())

    async def stop(self) -> None:
        self._stop_event.set()
        if self._flush_task is not None:
            await self._flush_task
        await self.flush()

    async def record_snapshot(self, snapshot: SnapshotMessage) -> None:
        if snapshot.status != "ok":
            return

        rows = [
            (
                snapshot.timestamp.isoformat(),
                chain_name,
                chain.packets,
                chain.bytes,
                chain.pps,
                chain.bps,
            )
            for chain_name, chain in snapshot.chains.items()
        ]

        async with self._lock:
            self._pending.extend(rows)
            should_flush = len(self._pending) >= self._batch_size

        if should_flush:
            await self.flush()

    async def flush(self) -> None:
        async with self._lock:
            if not self._pending:
                return
            batch = list(self._pending)
            self._pending.clear()

        await asyncio.to_thread(self._insert_many, batch)

    async def get_history(self, hours: int) -> HistoryResponse:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        rows = await asyncio.to_thread(self._fetch_since, since.isoformat())

        grouped: dict[str, dict[str, ChainStats]] = defaultdict(dict)
        for timestamp, chain_name, packets, bytes_count, pps, bps in rows:
            grouped[timestamp][chain_name] = ChainStats(
                chain=chain_name,
                packets=int(packets),
                bytes=int(bytes_count),
                pps=float(pps),
                bps=float(bps),
            )

        points = [
            HistoryPoint(
                timestamp=datetime.fromisoformat(timestamp),
                chains=grouped[timestamp],
            )
            for timestamp in sorted(grouped.keys())
        ]
        return HistoryResponse(points=points)

    async def _flush_worker(self) -> None:
        while not self._stop_event.is_set():
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self._flush_interval_seconds)
            except TimeoutError:
                await self.flush()
        await self.flush()

    def _initialize(self) -> None:
        with sqlite3.connect(self._database_path) as connection:
            connection.execute("PRAGMA journal_mode=WAL;")
            connection.execute("PRAGMA synchronous=NORMAL;")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS snapshots (
                    timestamp TEXT NOT NULL,
                    chain TEXT NOT NULL,
                    packets INTEGER NOT NULL,
                    bytes INTEGER NOT NULL,
                    pps REAL NOT NULL,
                    bps REAL NOT NULL,
                    PRIMARY KEY (timestamp, chain)
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp
                ON snapshots (timestamp)
                """
            )
            connection.commit()

    def _insert_many(self, rows: list[tuple[str, str, int, int, float, float]]) -> None:
        with sqlite3.connect(self._database_path) as connection:
            connection.executemany(
                """
                INSERT OR REPLACE INTO snapshots (
                    timestamp,
                    chain,
                    packets,
                    bytes,
                    pps,
                    bps
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                rows,
            )
            connection.commit()

    def _fetch_since(self, since_timestamp: str) -> list[tuple[str, str, int, int, float, float]]:
        with sqlite3.connect(self._database_path) as connection:
            cursor = connection.execute(
                """
                SELECT timestamp, chain, packets, bytes, pps, bps
                FROM snapshots
                WHERE timestamp >= ?
                ORDER BY timestamp ASC, chain ASC
                """,
                (since_timestamp,),
            )
            return list(cursor.fetchall())
