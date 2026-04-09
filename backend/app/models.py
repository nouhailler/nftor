from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ChainStats(BaseModel):
    chain: str
    packets: int = Field(ge=0)
    bytes: int = Field(ge=0)
    pps: float = Field(ge=0.0)
    bps: float = Field(ge=0.0)


class SnapshotMessage(BaseModel):
    type: Literal["snapshot"] = "snapshot"
    timestamp: datetime
    chains: dict[str, ChainStats]
    source_mode: Literal["direct", "sudo"] | None = None
    status: Literal["ok", "error"]
    error: str | None = None


class HistoryPoint(BaseModel):
    timestamp: datetime
    chains: dict[str, ChainStats]


class HistoryResponse(BaseModel):
    points: list[HistoryPoint]
