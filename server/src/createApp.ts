import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { CORS_ORIGINS } from './shared/utils/constants';
import authRoutes from './features/auth/auth.routes';
import roomRoutes from './features/rooms/rooms.routes';
import messageRoutes from './features/messages/messages.routes';
import moderationRoutes from './features/moderation/moderation.routes';
import threadRoutes from './features/messages/threads.routes';
import keyRoutes from './features/keys/keys.routes';
import aiRoutes from './features/ai/ai.routes';
import dmRoutes from './features/dm/dm.routes';
import notificationRoutes from './features/notifications/notifications.routes';
import uploadRoutes from './features/upload/upload.routes';
import callRoutes from './features/calls/calls.routes';

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

  // Trust proxy headers (X-Forwarded-For) from Vercel / reverse proxies
  // so express-rate-limit and other middleware read the real client IP.
  app.set('trust proxy', 1);
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
  app.use('/uploads', express.static(
    process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads')
  ));

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

  // Global Express error handler to guarantee JSON error output instead of HTML
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server error]:', err?.message || err);
    const status = (typeof err?.status === 'number' && err.status) || (typeof err?.statusCode === 'number' && err.statusCode) || 500;
    res.status(status).json({
      error: err?.message || 'Internal server error',
    });
  });

  return app;
}
