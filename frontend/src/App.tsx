import { useEffect, useMemo, type JSX } from "react";
import Chart from "./components/Chart";
import Filters from "./components/Filters";
import StatusBadge from "./components/StatusBadge";
import { useWebSocket } from "./hooks/useWebSocket";
import { useStore, type ChainStats, type HistoryPoint } from "./store/useStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function formatRate(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} MB/s`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)} KB/s`;
  }
  return `${value.toFixed(2)} B/s`;
}

function App(): JSX.Element {
  useWebSocket();

  const connectionStatus = useStore((state) => state.connectionStatus);
  const errorMessage = useStore((state) => state.errorMessage);
  const sourceMode = useStore((state) => state.sourceMode);
  const points = useStore((state) => state.points);
  const latestSnapshot = useStore((state) => state.latestSnapshot);
  const filters = useStore((state) => state.filters);
  const setHistory = useStore((state) => state.setHistory);
  const setChainFilter = useStore((state) => state.setChainFilter);
  const setSearchFilter = useStore((state) => state.setSearchFilter);
  const resetFilters = useStore((state) => state.resetFilters);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async (): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/api/history?hours=1`);
      if (!response.ok) {
        throw new Error(`History request failed with ${response.status}`);
      }
      const payload = (await response.json()) as { points: HistoryPoint[] };
      if (!cancelled) {
        setHistory(payload.points);
      }
    };

    void loadHistory().catch((error: unknown) => {
      if (!cancelled) {
        const message = error instanceof Error ? error.message : "Failed to load history";
        useStore.getState().setErrorMessage(message);
        useStore.getState().setConnectionStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [setHistory]);

  const liveChains = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();
    const chains = Object.values(latestSnapshot?.chains ?? {});
    return chains.filter((chain) => {
      const matchesChain = filters.chain === "all" || chain.chain === filters.chain;
      const matchesSearch = searchValue.length === 0 || chain.chain.includes(searchValue);
      return matchesChain && matchesSearch;
    });
  }, [filters.chain, filters.search, latestSnapshot]);

  const headlineStats = useMemo(() => {
    const statsByChain = latestSnapshot?.chains ?? {};
    return ["input", "output", "forward"].map((chainName) => {
      const chain = statsByChain[chainName] ?? {
        chain: chainName,
        packets: 0,
        bytes: 0,
        pps: 0,
        bps: 0
      };
      return chain;
    });
  }, [latestSnapshot]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(14, 165, 233, 0.22), transparent 30%), linear-gradient(160deg, #020617 0%, #0f172a 48%, #111827 100%)",
        color: "#e2e8f0",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "2rem 1.25rem 3rem",
          display: "grid",
          gap: "1.25rem"
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap"
          }}
        >
          <div>
            <p style={{ margin: 0, color: "#38bdf8", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.8rem" }}>
              nftables telemetry
            </p>
            <h1 style={{ margin: "0.35rem 0 0", fontSize: "clamp(2rem, 4vw, 3.4rem)", color: "#f8fafc" }}>nft-monitor</h1>
            <p style={{ margin: "0.75rem 0 0", maxWidth: 720, color: "#94a3b8", lineHeight: 1.6 }}>
              Real-time visibility into nftables counters with historical retention, live streaming, and chain-level filtering.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
            {sourceMode && (
              <span
                style={{
                  borderRadius: "999px",
                  padding: "0.5rem 0.85rem",
                  background: "rgba(8, 47, 73, 0.62)",
                  color: "#bae6fd",
                  border: "1px solid rgba(56, 189, 248, 0.24)"
                }}
              >
                source: {sourceMode}
              </span>
            )}
            <StatusBadge status={connectionStatus} />
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem"
          }}
        >
          {headlineStats.map((chain) => (
            <article
              key={chain.chain}
              style={{
                padding: "1.25rem",
                borderRadius: "24px",
                background: "rgba(15, 23, 42, 0.72)",
                border: "1px solid rgba(148, 163, 184, 0.12)",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)"
              }}
            >
              <p style={{ margin: 0, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.8rem" }}>
                {chain.chain}
              </p>
              <h2 style={{ margin: "0.55rem 0", fontSize: "1.9rem", color: "#f8fafc" }}>{formatRate(chain.bps)}</h2>
              <div style={{ color: "#cbd5e1", display: "grid", gap: "0.35rem", fontSize: "0.95rem" }}>
                <span>{chain.pps.toFixed(2)} pps</span>
                <span>{chain.packets.toLocaleString()} packets</span>
                <span>{chain.bytes.toLocaleString()} bytes</span>
              </div>
            </article>
          ))}
        </section>

        <Filters
          selectedChain={filters.chain}
          search={filters.search}
          onChainChange={setChainFilter}
          onSearchChange={setSearchFilter}
          onReset={resetFilters}
        />

        <Chart points={points} selectedChain={filters.chain} search={filters.search} />

        <section
          style={{
            padding: "1.25rem",
            borderRadius: "24px",
            background: "rgba(15, 23, 42, 0.72)",
            border: "1px solid rgba(148, 163, 184, 0.12)",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)"
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, color: "#f8fafc", fontSize: "1.15rem" }}>Live Chains</h2>
            <p style={{ margin: "0.4rem 0 0", color: "#94a3b8" }}>Current counters for matching chains</p>
          </div>

          {errorMessage ? (
            <div
              style={{
                borderRadius: "16px",
                padding: "1rem",
                background: "rgba(127, 29, 29, 0.35)",
                border: "1px solid rgba(248, 113, 113, 0.25)",
                color: "#fecaca"
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: "0.85rem" }}>
            {liveChains.length > 0 ? (
              liveChains.map((chain: ChainStats) => (
                <article
                  key={chain.chain}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "0.85rem",
                    padding: "1rem",
                    borderRadius: "18px",
                    background: "rgba(2, 6, 23, 0.55)",
                    border: "1px solid rgba(148, 163, 184, 0.08)"
                  }}
                >
                  <div>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>Chain</p>
                    <strong style={{ color: "#f8fafc", fontSize: "1.05rem" }}>{chain.chain}</strong>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>Rate</p>
                    <strong style={{ color: "#f8fafc" }}>{formatRate(chain.bps)}</strong>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>Packets</p>
                    <strong style={{ color: "#f8fafc" }}>{chain.packets.toLocaleString()}</strong>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>Bytes</p>
                    <strong style={{ color: "#f8fafc" }}>{chain.bytes.toLocaleString()}</strong>
                  </div>
                </article>
              ))
            ) : (
              <div
                style={{
                  borderRadius: "18px",
                  padding: "1.2rem",
                  background: "rgba(2, 6, 23, 0.55)",
                  border: "1px solid rgba(148, 163, 184, 0.08)",
                  color: "#94a3b8"
                }}
              >
                No chains match the current filters.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
