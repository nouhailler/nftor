# nft-monitor

Real-time nftables monitoring with a FastAPI backend, SQLite history storage, and a React dashboard powered by WebSocket streaming.

## Features

- Async nftables polling via `nft -j list ruleset`
- PPS and BPS rate calculation per chain
- SQLite history retention with batched writes
- REST history endpoint and live WebSocket stream
- React dashboard with Recharts, Zustand, filters, and reconnecting WebSocket client

## Repository Layout

```text
.
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── app/
│   │   ├── monitor.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── websocket.py
│   │   └── utils.py
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/
│       │   ├── Chart.tsx
│       │   ├── Filters.tsx
│       │   └── StatusBadge.tsx
│       ├── hooks/
│       │   └── useWebSocket.ts
│       └── store/
│           └── useStore.ts
├── README.md
└── AGENTS.md
```

## Requirements

- Python 3.11+
- Node.js 20+
- `nft` available on the host
- nftables counters enabled in rules

## Installation

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Development Mode

### Run backend

```bash
cd backend
uvicorn main:app --reload
```

The backend listens on `http://localhost:8000`.

### Run frontend

```bash
cd frontend
npm run dev
```

The frontend listens on `http://localhost:5173`.

## Production Mode

### Backend

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

### Backend Docker image

```bash
cd backend
docker build -t nft-monitor-backend .
docker run --rm -p 8000:8000 --cap-add=NET_ADMIN nft-monitor-backend
```

## nft Permissions Setup

The application does not require running the Python process as root. It first tries direct access to `nft`, then falls back to `sudo -n nft`.

### Option 1: grant capability to `nft`

```bash
sudo setcap cap_net_admin+ep "$(command -v nft)"
getcap "$(command -v nft)"
```

### Option 2: allow passwordless sudo for nft only

Create a sudoers drop-in:

```bash
sudo visudo -f /etc/sudoers.d/nft-monitor
```

Add:

```text
your-user ALL=(root) NOPASSWD: /usr/sbin/nft
```

Adjust the path if `command -v nft` returns a different location.

## API

### WebSocket

- Endpoint: `ws://localhost:8000/ws/nft`
- Future auth placeholder: `?token=...`
- Message shape:

```json
{
  "type": "snapshot",
  "timestamp": "2026-04-09T12:00:00+00:00",
  "chains": {
    "input": {
      "chain": "input",
      "packets": 123,
      "bytes": 4567,
      "pps": 20.5,
      "bps": 8120.0
    }
  },
  "source_mode": "direct",
  "status": "ok",
  "error": null
}
```

### REST

- `GET /api/history?hours=1`

## Environment Variables

### Frontend

- `VITE_API_BASE_URL`
- `VITE_WS_URL`
- `VITE_WS_TOKEN`

Defaults:

- API: `http://localhost:8000`
- WS: `ws://localhost:8000/ws/nft`

## Example Traffic Generation

Generate ingress/egress activity to produce visible counter changes:

```bash
ping -i 0.2 1.1.1.1
```

```bash
curl -L https://example.com --output /dev/null
```

```bash
iperf3 -c <server> -t 30
```

```bash
ab -n 1000 -c 20 http://127.0.0.1/
```

## Notes

- The dashboard keeps the most recent 120 points in memory.
- Base-chain visibility depends on chain names in your ruleset. The UI is optimized for `input`, `output`, and `forward`.
- The backend handles nft execution errors gracefully and streams error snapshots instead of crashing.
