import { useMemo, type JSX } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { HistoryPoint } from "../store/useStore";

interface ChartProps {
  points: HistoryPoint[];
  selectedChain: "all" | "input" | "output" | "forward";
  search: string;
}

interface ChartPoint {
  timestamp: string;
  input_bps: number;
  output_bps: number;
  forward_bps: number;
}

const chainKeys: Array<keyof Omit<ChartPoint, "timestamp">> = ["input_bps", "output_bps", "forward_bps"];

export function Chart({ points, selectedChain, search }: ChartProps): JSX.Element {
  const chartData = useMemo<ChartPoint[]>(() => {
    const searchValue = search.trim().toLowerCase();

    return points.map((point) => {
      const input = point.chains.input?.bps ?? 0;
      const output = point.chains.output?.bps ?? 0;
      const forward = point.chains.forward?.bps ?? 0;

      const includeInput = (selectedChain === "all" || selectedChain === "input") && "input".includes(searchValue || "input");
      const includeOutput =
        (selectedChain === "all" || selectedChain === "output") && "output".includes(searchValue || "output");
      const includeForward =
        (selectedChain === "all" || selectedChain === "forward") && "forward".includes(searchValue || "forward");

      return {
        timestamp: new Date(point.timestamp).toLocaleTimeString(),
        input_bps: includeInput ? input : 0,
        output_bps: includeOutput ? output : 0,
        forward_bps: includeForward ? forward : 0
      };
    });
  }, [points, search, selectedChain]);

  const visibleKeys = useMemo(() => {
    return chainKeys.filter((key) => {
      if (selectedChain === "all") {
        return true;
      }
      return key.startsWith(selectedChain);
    });
  }, [selectedChain]);

  return (
    <section
      style={{
        height: 360,
        borderRadius: "28px",
        padding: "1rem 1.25rem 1.5rem",
        background: "rgba(15, 23, 42, 0.78)",
        border: "1px solid rgba(148, 163, 184, 0.12)",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)"
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: "#f8fafc", fontSize: "1.15rem" }}>Realtime Throughput</h2>
        <p style={{ margin: "0.4rem 0 0", color: "#94a3b8" }}>Bytes per second by base chain</p>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" minTickGap={24} stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              background: "#020617",
              border: "1px solid rgba(148, 163, 184, 0.24)",
              borderRadius: "16px",
              color: "#f8fafc"
            }}
          />
          <Legend />
          {visibleKeys.includes("input_bps") && (
            <Line type="linear" dataKey="input_bps" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
          )}
          {visibleKeys.includes("output_bps") && (
            <Line type="linear" dataKey="output_bps" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} />
          )}
          {visibleKeys.includes("forward_bps") && (
            <Line
              type="linear"
              dataKey="forward_bps"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

export default Chart;
