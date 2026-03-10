import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth';
import { JwtPayload } from '../middleware/auth';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAlive?: boolean;
}

const clients = new Set<AuthenticatedWebSocket>();

export function getClients(): Set<AuthenticatedWebSocket> {
  return clients;
}

export function broadcast(data: object, exclude?: AuthenticatedWebSocket): void {
  const payload = JSON.stringify(data);
  clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function handleWebSocketConnection(ws: AuthenticatedWebSocket, url: string): void {
  const tokenMatch = url.match(/[?&]token=([^&]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  if (!token) {
    ws.close(4001, 'Missing token');
    return;
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    ws.userId = decoded.userId;
    ws.username = decoded.username;
    ws.isAlive = true;
  } catch {
    ws.close(4002, 'Invalid token');
    return;
  }
  clients.add(ws);

  ws.on('pong', () => {
    (ws as AuthenticatedWebSocket).isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
      if (msg.type === 'broadcast' && msg.payload) {
        broadcast({ type: 'sync', payload: msg.payload, from: ws.username }, ws);
      }
    } catch {
      // ignore invalid messages
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });

  ws.on('error', () => {
    clients.delete(ws);
  });
}

export function startHeartbeat(wss: { clients: Set<WebSocket> }): void {
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const aws = ws as AuthenticatedWebSocket;
      if (aws.isAlive === false) {
        clients.delete(aws);
        return ws.terminate();
      }
      aws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  return void interval;
}
