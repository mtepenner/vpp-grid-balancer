import { useEffect, useRef, useState } from 'react';
import { DispatchEvent } from '../components/DispatchTerminal';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws';
const MAX_EVENTS = 200;
const RECONNECT_DELAY_MS = 3000;

export interface GridMetrics {
  frequency: number;
  dispatchedCount: number;
  totalBatteries: number;
}

const DEFAULT_METRICS: GridMetrics = {
  frequency: 60.0,
  dispatchedCount: 0,
  totalBatteries: 0,
};

/** Connects to the dispatch engine WebSocket and returns live grid metrics. */
export function useGridMetrics(): { metrics: GridMetrics; events: DispatchEvent[] } {
  const [metrics, setMetrics] = useState<GridMetrics>(DEFAULT_METRICS);
  const [events, setEvents] = useState<DispatchEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data as string) as {
            frequency: number;
            dispatchedCount: number;
            totalBatteries: number;
            event?: string;
            timestamp: string;
          };

          setMetrics({
            frequency: data.frequency,
            dispatchedCount: data.dispatchedCount,
            totalBatteries: data.totalBatteries,
          });

          if (data.event) {
            const newEvent: DispatchEvent = {
              id: `${data.timestamp}-${Math.random()}`,
              timestamp: new Date(data.timestamp).toLocaleTimeString(),
              message: data.event,
              isTrip: data.frequency < 59.9,
            };
            setEvents(prev => [...prev.slice(-MAX_EVENTS + 1), newEvent]);
          }
        } catch {
          // Ignore malformed messages.
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  return { metrics, events };
}
