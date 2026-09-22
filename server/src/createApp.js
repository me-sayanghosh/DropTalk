import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { CORS_ORIGINS } from './shared/utils/constants.js';
import authRoutes from './features/auth/auth.routes.js';
import roomRoutes from './features/rooms/rooms.routes.js';
import messageRoutes from './features/messages/messages.routes.js';
import moderationRoutes from './features/moderation/moderation.routes.js';
import threadRoutes from './features/messages/threads.routes.js';
import keyRoutes from './features/keys/keys.routes.js';
import aiRoutes from './features/ai/ai.routes.js';
import dmRoutes from './features/dm/dm.routes.js';
import notificationRoutes from './features/notifications/notifications.routes.js';
import uploadRoutes from './features/upload/upload.routes.js';
import callRoutes from './features/calls/calls.routes.js';

const dev = process.env.NODE_ENV !== 'production';

/**
 * Creates and configures the Express app with all middleware and API routes.
 * Used by both the unified server (server.js) and the standalone server (server/src/index.js).
 *
 * @param {object} [options]
 * @param {boolean} [options.disableCSP=false] - Set true when Next.js is mounted (handles its own CSP).
 * @returns {import('express').Express}
 */
export function createApp({ disableCSP = false } = {}) {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: disableCSP ? false : undefined,
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
    max: dev ? 1000 : 100,
    message: { error: 'Too many attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/me' || req.path === '/refresh' || req.path.startsWith('/check-username'),
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

  return app;
}
