export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE) ||
  'http://localhost:4000/api';

export const SERVER_URL: string =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (typeof process !== 'undefined' && process.env?.VITE_SERVER_URL) ||
  'http://localhost:4000';

export const GOOGLE_CLIENT_ID: string =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_CLIENT_ID) ||
  '';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  OFFLINE_QUEUE: 'chatapp:offlineQueue',
  LAST_SEEN: 'chatapp:lastSeen',
  RSA_KEYS: 'chatapp:userRsaKeys',
  ROOM_KEYS: 'chatapp:roomKeys',
} as const;

export const ROOM_TYPES = ['public', 'private', 'ephemeral'] as const;

export const TYPING_TIMEOUT_MS = 3000;

export const MESSAGE_LIMITS = {
  default: 100,
  max: 500,
};

export const ROTATING_WORDS = ['boundaries.', 'limits.', 'borders.', 'delays.'];

export function getMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const cleanServer = SERVER_URL.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanServer}${cleanPath}`;
}
