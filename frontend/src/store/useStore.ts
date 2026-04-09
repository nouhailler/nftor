import { create } from "zustand";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface ChainStats {
  chain: string;
  packets: number;
  bytes: number;
  pps: number;
  bps: number;
}

export interface SnapshotMessage {
  type: "snapshot";
  timestamp: string;
  chains: Record<string, ChainStats>;
  source_mode: "direct" | "sudo" | null;
  status: "ok" | "error";
  error: string | null;
}

export interface HistoryPoint {
  timestamp: string;
  chains: Record<string, ChainStats>;
}

interface FilterState {
  chain: "all" | "input" | "output" | "forward";
  search: string;
}

interface AppState {
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  sourceMode: "direct" | "sudo" | null;
  points: HistoryPoint[];
  latestSnapshot: SnapshotMessage | null;
  filters: FilterState;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setErrorMessage: (message: string | null) => void;
  setSourceMode: (mode: "direct" | "sudo" | null) => void;
  setHistory: (points: HistoryPoint[]) => void;
  addSnapshot: (snapshot: SnapshotMessage) => void;
  setChainFilter: (chain: FilterState["chain"]) => void;
  setSearchFilter: (search: string) => void;
  resetFilters: () => void;
}

const MAX_POINTS = 120;

export const useStore = create<AppState>((set) => ({
  connectionStatus: "connecting",
  errorMessage: null,
  sourceMode: null,
  points: [],
  latestSnapshot: null,
  filters: {
    chain: "all",
    search: ""
  },
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setSourceMode: (mode) => set({ sourceMode: mode }),
  setHistory: (points) => set({ points: points.slice(-MAX_POINTS) }),
  addSnapshot: (snapshot) =>
    set((state) => {
      if (snapshot.status === "error") {
        return {
          connectionStatus: "error",
          errorMessage: snapshot.error,
          latestSnapshot: snapshot
        };
      }

      const nextPoint: HistoryPoint = {
        timestamp: snapshot.timestamp,
        chains: snapshot.chains
      };

      const nextPoints = [...state.points, nextPoint].slice(-MAX_POINTS);
      return {
        connectionStatus: "connected",
        errorMessage: null,
        sourceMode: snapshot.source_mode,
        latestSnapshot: snapshot,
        points: nextPoints
      };
    }),
  setChainFilter: (chain) =>
    set((state) => ({
      filters: {
        ...state.filters,
        chain
      }
    })),
  setSearchFilter: (search) =>
    set((state) => ({
      filters: {
        ...state.filters,
        search
      }
    })),
  resetFilters: () =>
    set({
      filters: {
        chain: "all",
        search: ""
      }
    })
}));
