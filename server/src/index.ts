import 'dotenv/config';
import http from 'http';
import dns from 'node:dns/promises';

import { connectDB } from './shared/config/db';
import { createApp } from './createApp';
import { attachSocket } from './shared/socket/index';
import { reconcilePresence } from './features/presence/presence.service';

dns.setServers(['1.1.1.1', '8.8.8.8']);

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled rejection:', reason);
});

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatapp';

const app = createApp();

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
  console.log(`[server] http://localhost:${PORT}`);
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
