import { useEffect, useRef } from "react";
import { useStore, type SnapshotMessage } from "../store/useStore";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/nft";
const WS_TOKEN = import.meta.env.VITE_WS_TOKEN ?? "";

function resolveWebSocketUrl(rawUrl: string): string {
  if (rawUrl.startsWith("ws://") || rawUrl.startsWith("wss://")) {
    return rawUrl;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return new URL(rawUrl, `${protocol}//${window.location.host}`).toString();
}

export function useWebSocket(): void {
  const addSnapshot = useStore((state) => state.addSnapshot);
  const setConnectionStatus = useStore((state) => state.setConnectionStatus);
  const setErrorMessage = useStore((state) => state.setErrorMessage);
  const reconnectTimerRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let isActive = true;

    const clearTimers = (): void => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (pingTimerRef.current !== null) {
        window.clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    };

    const scheduleReconnect = (): void => {
      clearTimers();
      if (!isActive) {
        return;
      }
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, 2000);
    };

    const connect = (): void => {
      setConnectionStatus("connecting");
      const url = new URL(resolveWebSocketUrl(WS_URL));
      if (WS_TOKEN) {
        url.searchParams.set("token", WS_TOKEN);
      }

      const ws = new WebSocket(url.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
        setErrorMessage(null);
        pingTimerRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SnapshotMessage;
          addSnapshot(message);
        } catch (error) {
          setConnectionStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Invalid WebSocket payload");
        }
      };

      ws.onerror = () => {
        setConnectionStatus("error");
      };

      ws.onclose = () => {
        if (!isActive) {
          return;
        }
        setConnectionStatus("disconnected");
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      isActive = false;
      clearTimers();
      wsRef.current?.close();
    };
  }, [addSnapshot, setConnectionStatus, setErrorMessage]);
}
