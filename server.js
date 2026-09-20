import 'dotenv/config';
import http from 'http';
import dns from 'node:dns/promises';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import next from 'next';

import { CORS_ORIGINS } from './server/src/shared/utils/constants.js';

dns.setServers(['1.1.1.1', '8.8.8.8']);

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled rejection:', reason);
});

import { connectDB } from './server/src/shared/config/db.js';
import authRoutes from './server/src/features/auth/auth.routes.js';
import roomRoutes from './server/src/features/rooms/rooms.routes.js';
import messageRoutes from './server/src/features/messages/messages.routes.js';
import moderationRoutes from './server/src/features/moderation/moderation.routes.js';
import threadRoutes from './server/src/features/messages/threads.routes.js';
import keyRoutes from './server/src/features/keys/keys.routes.js';
import aiRoutes from './server/src/features/ai/ai.routes.js';
import dmRoutes from './server/src/features/dm/dm.routes.js';
import notificationRoutes from './server/src/features/notifications/notifications.routes.js';
import uploadRoutes from './server/src/features/upload/upload.routes.js';
import callRoutes from './server/src/features/calls/calls.routes.js';
import { attachSocket } from './server/src/shared/socket/index.js';
import { reconcilePresence } from './server/src/features/presence/presence.service.js';

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 4000;
const hostname = process.env.HOSTNAME || 'localhost';

const nextApp = next({ dev, hostname, port: PORT });
const handle = nextApp.getRequestHandler();

await nextApp.prepare();

const app = express();
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', messageRoutes);
app.use('/api/rooms', moderationRoutes);
app.use('/api/rooms', threadRoutes);
app.use('/api/rooms', keyRoutes);
app.use('/api/rooms', aiRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/calls', callRoutes);

// Next.js handles all other requests (pages, static assets, etc.)
app.all('*', (req, res) => {
  return handle(req, res);
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatapp';

try {
  await connectDB(MONGODB_URI);
} catch (err) {
  console.error('[fatal] database connection failed:', err.message);
  process.exit(1);
}

const server = http.createServer(app);
const { close: closeSocket } = attachSocket(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[fatal] port ${PORT} is already in use`);
  } else {
    console.error('[fatal] server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`> DropTalk unified server listening at http://${hostname}:${PORT}`);
  setInterval(() => {
    reconcilePresence().catch((err) => console.error('[reconcile] error:', err.message));
  }, 90000);
});

const gracefulShutdown = (signal) => {
  console.log(`[server] ${signal} received, shutting down...`);
  server.close(async () => {
    await closeSocket();
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[server] forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
