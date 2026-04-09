from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from app.database import HistoryDatabase
from app.models import ChainStats, SnapshotMessage
from app.utils import NftCommandError, parse_ruleset_chains, run_nft_ruleset_json
from app.websocket import ConnectionManager


class NftMonitorService:
    def __init__(
        self,
        database: HistoryDatabase,
        websocket_manager: ConnectionManager,
        poll_interval_seconds: float = 1.5,
    ) -> None:
        self._database = database
        self._websocket_manager = websocket_manager
        self._poll_interval_seconds = poll_interval_seconds
        self._previous_totals: dict[str, tuple[int, int]] = {}
        self._previous_timestamp: datetime | None = None
        self._stop_event = asyncio.Event()
        self._task: asyncio.Task[None] | None = None
        self.latest_snapshot: SnapshotMessage | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task is not None:
            await self._task

    async def _run(self) -> None:
        while not self._stop_event.is_set():
            snapshot = await self._collect_snapshot()
            self.latest_snapshot = snapshot
            await self._websocket_manager.broadcast(snapshot)
            await self._database.record_snapshot(snapshot)

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self._poll_interval_seconds)
            except TimeoutError:
                continue

    async def _collect_snapshot(self) -> SnapshotMessage:
        collected_at = datetime.now(timezone.utc)

        try:
            payload, source_mode = await run_nft_ruleset_json()
            chain_totals = parse_ruleset_chains(payload)
            chains = self._build_chain_stats(chain_totals=chain_totals, collected_at=collected_at)
            return SnapshotMessage(
                timestamp=collected_at,
                chains=chains,
                source_mode=source_mode,
                status="ok",
            )
        except NftCommandError as exc:
            return SnapshotMessage(
                timestamp=collected_at,
                chains={},
                source_mode=None,
                status="error",
                error=str(exc),
            )

    def _build_chain_stats(
        self,
        chain_totals: dict[str, dict[str, int]],
        collected_at: datetime,
    ) -> dict[str, ChainStats]:
        elapsed_seconds = 0.0
        if self._previous_timestamp is not None:
            elapsed_seconds = (collected_at - self._previous_timestamp).total_seconds()
        self._previous_timestamp = collected_at

        chains: dict[str, ChainStats] = {}
        for chain_name, totals in chain_totals.items():
            packets = int(totals.get("packets", 0))
            bytes_count = int(totals.get("bytes", 0))

            previous_packets, previous_bytes = self._previous_totals.get(chain_name, (packets, bytes_count))
            delta_packets = max(0, packets - previous_packets)
            delta_bytes = max(0, bytes_count - previous_bytes)

            pps = 0.0
            bps = 0.0
            if elapsed_seconds > 0:
                pps = delta_packets / elapsed_seconds
                bps = delta_bytes / elapsed_seconds

            chains[chain_name] = ChainStats(
                chain=chain_name,
                packets=packets,
                bytes=bytes_count,
                pps=pps,
                bps=bps,
            )
            self._previous_totals[chain_name] = (packets, bytes_count)

        missing_chains = set(self._previous_totals.keys()) - set(chain_totals.keys())
        for chain_name in missing_chains:
            del self._previous_totals[chain_name]

        return chains
