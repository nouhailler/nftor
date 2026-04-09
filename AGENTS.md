# AGENTS.md

## Architecture

- `backend/main.py` wires FastAPI lifespan, REST routes, and the WebSocket endpoint.
- `backend/app/monitor.py` owns the polling loop, rate calculation, and broadcast flow.
- `backend/app/utils.py` is the only place that executes `nft`.
- `backend/app/database.py` owns SQLite schema, batched persistence, and history queries.
- `frontend/src/store/useStore.ts` is the single client-side state container.
- `frontend/src/hooks/useWebSocket.ts` owns WebSocket lifecycle and reconnect behavior.
- `frontend/src/components/` contains presentational UI only.

## Conventions

- Keep backend code async-first. Blocking work must go through `asyncio.to_thread` or async subprocess APIs.
- Never use `shell=True` for nft execution.
- Preserve typed interfaces across REST, WebSocket, and Zustand state.
- Keep chain names normalized to lowercase.
- Limit frontend time-series memory to 120 points unless requirements change.
- Prefer extending existing modules over introducing new abstractions for simple behavior.

## Modification Rules For Future Agents

- Start from the existing backend and frontend contracts before changing message shapes.
- If the WebSocket payload changes, update backend Pydantic models and the frontend store types together.
- If SQLite schema changes, add migration-safe initialization logic instead of destructive resets.
- Do not add synchronous database or subprocess calls on the FastAPI event loop.
- Keep authentication additions backward-compatible with the existing token placeholder on `/ws/nft`.
- When adding charts or UI panels, reuse the Zustand store and derive computed data with `useMemo`.
- Preserve the current startup commands:
  - Backend: `uvicorn main:app`
  - Frontend: `npm run dev`
- Prefer small, composable edits. Avoid broad rewrites unless the architecture is being intentionally changed.
