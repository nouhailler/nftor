import type { CSSProperties, JSX } from "react";

interface FiltersProps {
  selectedChain: "all" | "input" | "output" | "forward";
  search: string;
  onChainChange: (value: "all" | "input" | "output" | "forward") => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}

const inputStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  background: "rgba(15, 23, 42, 0.55)",
  color: "#e2e8f0",
  padding: "0.75rem 0.9rem",
  fontSize: "0.95rem"
};

export function Filters({
  selectedChain,
  search,
  onChainChange,
  onSearchChange,
  onReset
}: FiltersProps): JSX.Element {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        padding: "1.25rem",
        borderRadius: "24px",
        background: "rgba(15, 23, 42, 0.72)",
        border: "1px solid rgba(148, 163, 184, 0.12)",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)"
      }}
    >
      <label style={{ display: "grid", gap: "0.5rem", color: "#cbd5e1" }}>
        <span>Chain</span>
        <select
          style={inputStyle}
          value={selectedChain}
          onChange={(event) => onChainChange(event.target.value as FiltersProps["selectedChain"])}
        >
          <option value="all">All</option>
          <option value="input">Input</option>
          <option value="output">Output</option>
          <option value="forward">Forward</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: "0.5rem", color: "#cbd5e1" }}>
        <span>Search</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Filter chain names"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      <div style={{ display: "flex", alignItems: "end" }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            width: "100%",
            border: 0,
            borderRadius: "12px",
            padding: "0.85rem 1rem",
            background: "linear-gradient(135deg, #22c55e, #14b8a6)",
            color: "#042f2e",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default Filters;
