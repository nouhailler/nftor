from __future__ import annotations

import asyncio
import json
from collections.abc import Iterable
from typing import Any


class NftCommandError(RuntimeError):
    pass


def _extract_counter_value(node: Any) -> tuple[int, int]:
    packets = 0
    bytes_count = 0

    if isinstance(node, dict):
        for key, value in node.items():
            if key == "counter" and isinstance(value, dict):
                packets += int(value.get("packets", 0))
                bytes_count += int(value.get("bytes", 0))
            else:
                child_packets, child_bytes = _extract_counter_value(value)
                packets += child_packets
                bytes_count += child_bytes
    elif isinstance(node, list):
        for item in node:
            child_packets, child_bytes = _extract_counter_value(item)
            packets += child_packets
            bytes_count += child_bytes

    return packets, bytes_count


async def run_nft_ruleset_json(timeout_seconds: float = 5.0) -> tuple[dict[str, Any], str]:
    commands: Iterable[tuple[str, ...]] = (
        ("nft", "-j", "list", "ruleset"),
        ("sudo", "-n", "nft", "-j", "list", "ruleset"),
    )

    last_error: str | None = None

    for command in commands:
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError as exc:
            last_error = f"{command[0]} not found: {exc}"
            continue
        except OSError as exc:
            last_error = f"Failed to start {' '.join(command)}: {exc}"
            continue

        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout_seconds)
        except TimeoutError:
            process.kill()
            await process.communicate()
            last_error = f"{' '.join(command)} timed out after {timeout_seconds:.1f}s"
            continue

        if process.returncode != 0:
            stderr_text = stderr.decode("utf-8", errors="replace").strip()
            if stderr_text:
                last_error = stderr_text
            else:
                last_error = f"{' '.join(command)} exited with {process.returncode}"
            continue

        stdout_text = stdout.decode("utf-8", errors="replace")
        try:
            payload = json.loads(stdout_text)
        except json.JSONDecodeError as exc:
            raise NftCommandError(f"Invalid JSON from nft: {exc}") from exc

        mode = "sudo" if command[0] == "sudo" else "direct"
        return payload, mode

    raise NftCommandError(last_error or "Unable to execute nft command")


def parse_ruleset_chains(payload: dict[str, Any]) -> dict[str, dict[str, int]]:
    chains: dict[str, dict[str, int]] = {}

    for item in payload.get("nftables", []):
        chain_obj = item.get("chain")
        if isinstance(chain_obj, dict):
            chain_name = str(chain_obj.get("name", "")).strip().lower()
            if chain_name:
                chains.setdefault(chain_name, {"packets": 0, "bytes": 0})
            continue

        rule_obj = item.get("rule")
        if not isinstance(rule_obj, dict):
            continue

        chain_name = str(rule_obj.get("chain", "")).strip().lower()
        if not chain_name:
            continue

        packets, bytes_count = _extract_counter_value(rule_obj)
        chain_totals = chains.setdefault(chain_name, {"packets": 0, "bytes": 0})
        chain_totals["packets"] += packets
        chain_totals["bytes"] += bytes_count

    return chains
