import { useEffect, useRef } from 'react';
import { TOKEN_KEY } from '../services/apiClient';

export interface GroupWsMessage {
  event: string;
  group_id?: number;
  data?: Record<string, unknown>;
}

export function useGroupWebSocket(
  groupId: number | null,
  onEvent: (msg: GroupWsMessage) => void
): void {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!groupId || !token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/groups/${groupId}/?token=${encodeURIComponent(token)}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }

    ws.onmessage = (evt) => {
      try {
        const parsed: GroupWsMessage = JSON.parse(evt.data);
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
  }, [groupId]);
}
