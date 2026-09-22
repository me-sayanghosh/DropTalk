import 'dotenv/config';
import http from 'http';
import dns from 'node:dns/promises';
import next from 'next';
import path from 'path';
import fs from 'fs';
import { rm } from 'fs/promises';

import { connectDB } from './server/src/shared/config/db.js';
import { createApp } from './server/src/createApp.js';
import { attachSocket } from './server/src/shared/socket/index.js';
import { reconcilePresence } from './server/src/features/presence/presence.service.js';

dns.setServers(['1.1.1.1', '8.8.8.8']);

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled rejection:', reason);
});

function ensureNextCommonJs() {
  const dirs = [
    path.join(process.cwd(), '.next'),
    path.join(process.cwd(), '.next', 'server'),
    path.join(process.cwd(), '.next', 'server', 'app'),
  ];
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const pkgPath = path.join(dir, 'package.json');
      if (!fs.existsSync(pkgPath)) {
        fs.writeFileSync(pkgPath, JSON.stringify({ type: 'commonjs' }, null, 2));
      }
    } catch {
      // ignore
    }
  }
}

ensureNextCommonJs();

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 4000;
const hostname = process.env.HOSTNAME || 'localhost';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatapp';

// In dev mode, always wipe .next before Next.js compiles so that the
// webpack runtime never references chunk IDs from a previous session.
// This eliminates "Cannot find module './104.js'" after watch restarts.
if (dev) {
  try {
    await rm(path.join(process.cwd(), '.next'), { recursive: true, force: true });
    console.log('[server] cleared .next for fresh dev compilation');
  } catch {
    // ignore — .next may not exist on first run
  }
}

const nextApp = next({ dev, hostname, port: PORT });
const handle = nextApp.getRequestHandler();

await nextApp.prepare();
ensureNextCommonJs();

// Build shared Express app (CSP disabled so Next.js can manage its own headers)
const app = createApp({ disableCSP: true });

// Next.js handles all non-API requests (pages, static assets, etc.)
app.all('*', (req, res) => {
  ensureNextCommonJs();
  return handle(req, res);
});

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
