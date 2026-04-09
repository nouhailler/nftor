import type { JSX } from "react";
import type { ConnectionStatus } from "../store/useStore";

interface StatusBadgeProps {
  status: ConnectionStatus;
}

const statusColorMap: Record<ConnectionStatus, string> = {
  connecting: "#f59e0b",
  connected: "#10b981",
  disconnected: "#64748b",
  error: "#ef4444"
};

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        borderRadius: "999px",
        padding: "0.5rem 0.85rem",
        background: "rgba(15, 23, 42, 0.72)",
        color: "#e2e8f0",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        fontSize: "0.9rem",
        textTransform: "capitalize"
      }}
    >
      <span
        style={{
          width: "0.65rem",
          height: "0.65rem",
          borderRadius: "999px",
          background: statusColorMap[status]
        }}
      />
      {status}
    </span>
  );
}

export default StatusBadge;
