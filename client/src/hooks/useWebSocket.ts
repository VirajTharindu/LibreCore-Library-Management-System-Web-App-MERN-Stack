import { useEffect, useRef } from 'react';
import { createWebSocket, WsMessage } from '../services/websocket';
import { useAuth } from '../context/AuthContext';

export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!token) return;
    const ws = createWebSocket(token, (msg) => onMessageRef.current(msg));
    wsRef.current = ws;
    return () => {
      if (ws) ws.close();
      wsRef.current = null;
    };
  }, [token]);

  return wsRef;
}
