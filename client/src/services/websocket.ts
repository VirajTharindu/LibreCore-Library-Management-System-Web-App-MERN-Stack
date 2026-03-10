const WS_BASE =
  typeof window !== 'undefined'
    ? (import.meta.env.VITE_WS_URL ||
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`)
    : '';

export type WsMessage =
  | { type: 'books:changed'; action: string; book?: unknown; bookId?: string }
  | { type: 'pong' }
  | { type: 'sync'; payload: unknown; from?: string };

export function createWebSocket(token: string | null, onMessage: (msg: WsMessage) => void): WebSocket | null {
  if (!token || !WS_BASE) return null;
  const url = `${WS_BASE.replace(/\/$/, '')}/ws?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WsMessage;
      onMessage(msg);
    } catch {
      // ignore
    }
  };

  ws.onerror = () => {};
  return ws;
}
