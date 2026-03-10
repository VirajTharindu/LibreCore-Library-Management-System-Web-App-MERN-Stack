import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import authRoutes from './routes/auth';
import booksRoutes from './routes/books';
import borrowingsRoutes from './routes/borrowings';
import { handleWebSocketConnection, startHeartbeat } from './websocket/handler';
import { broadcast } from './websocket/handler';

const app = express();
const PORT = process.env.PORT || 4000;
const API_BASE = '/api';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(`${API_BASE}/auth`, authRoutes);
app.use(`${API_BASE}/books`, booksRoutes);
app.use(`${API_BASE}/borrowings`, borrowingsRoutes);

// Serve static client in production
const clientPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith(API_BASE)) return next();
  res.sendFile(path.join(clientPath, 'index.html'), (err) => {
    if (err) next();
  });
});

const server = createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  handleWebSocketConnection(ws as import('./websocket/handler').AuthenticatedWebSocket, req.url || '');
});
startHeartbeat(wss);

export { broadcast };
server.listen(PORT, () => {
  console.log(`LibreCore Server running on http://localhost:${PORT}`);
  console.log(`WebSocket on ws://localhost:${PORT}/ws`);
});
