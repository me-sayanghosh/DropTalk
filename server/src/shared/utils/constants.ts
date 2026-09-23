export const ROLE_HIERARCHY = { owner: 3, moderator: 2, member: 1 };
export const ROOM_TYPES = ['public', 'private', 'ephemeral'];
export const ROLES = ['owner', 'moderator', 'member'];
export const DEFAULT_ROOMS = [
  { name: 'general', type: 'public' },
  { name: 'random', type: 'public' },
  { name: 'lounge', type: 'public' },
];

export const JWT_SECRET = process.env.JWT_SECRET || 'droptalk_default_jwt_secret_dev_key';

export const CORS_ORIGINS = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (!origin) return callback(null, true);

  const configured = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'];

  if (configured.includes(origin)) return callback(null, true);

  // Allow all localhost, 127.0.0.1, and local private network origins on any port (HTTP or HTTPS)
  if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }

  if (process.env.CORS_ORIGIN === '*' || process.env.NODE_ENV !== 'production') {
    return callback(null, true);
  }

  // Allow common deployment platforms (Vercel, Render, Railway, Fly, Netlify)
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    if (
      host.endsWith('.vercel.app') ||
      host === 'vercel.app' ||
      host.endsWith('.onrender.com') ||
      host.endsWith('.railway.app') ||
      host.endsWith('.up.railway.app') ||
      host.endsWith('.fly.dev') ||
      host.endsWith('.netlify.app')
    ) {
      return callback(null, true);
    }
  } catch {}

  // Allow automatic Vercel system environment URL if set
  if (process.env.VERCEL_URL && (origin === `https://${process.env.VERCEL_URL}` || origin === `http://${process.env.VERCEL_URL}`)) {
    return callback(null, true);
  }

  // Allow NEXT_PUBLIC_SERVER_URL if set
  if (process.env.NEXT_PUBLIC_SERVER_URL && origin === process.env.NEXT_PUBLIC_SERVER_URL.replace(/\/$/, '')) {
    return callback(null, true);
  }

  // Disallow unrecognized cross-origin requests cleanly without throwing a 500 error
  callback(null, false);
};

export const TOKEN_EXPIRY = {
  access: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  refresh: process.env.REFRESH_TOKEN_EXPIRY || '7d',
};

export const PRESENCE = {
  HEARTBEAT_TTL_MS: 60000,
  HEARTBEAT_REFRESH_MS: 30000,
  RECONCILE_INTERVAL_MS: 90000,
};

export const TYPING_TTL_MS = 3000;

export const MESSAGE_LIMITS = {
  default: 100,
  max: 500,
  backfillMax: 20,
  threadMax: 100,
};

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
