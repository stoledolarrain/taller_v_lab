import { useEffect, useRef } from 'react';
import { TOKEN_KEY } from '../services/apiClient';

export interface UserWsMessage {
  event: string;
  user_id?: number;
  data?: Record<string, unknown>;
}

export function useUserWebSocket(
  enabled: boolean,
  onEvent: (msg: UserWsMessage) => void
): void {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!enabled || !token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/users/me/?token=${encodeURIComponent(token)}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }

    ws.onmessage = (evt) => {
      try {
        const parsed: UserWsMessage = JSON.parse(evt.data);
        if (parsed.event !== 'connection_established' && parsed.event !== 'pong') {
          onEventRef.current(parsed);
        }
      } catch {
        // Ignorar tramas no JSON
      }
    };

    const pingInterval = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30_000);

    return () => {
      window.clearInterval(pingInterval);
      ws.close();
    };
  }, [enabled]);
}
