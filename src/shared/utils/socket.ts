import { io, Socket } from 'socket.io-client';
import { SERVER_URL, STORAGE_KEYS } from './constants';
import { api, getRefreshToken, setTokens } from './api';

let socket: Socket | null = null;
let onReconnectCallback: (() => void) | null = null;

interface OfflineQueueItem {
  event: string;
  data: any;
  timestamp: number;
}

function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE) || '[]');
  } catch {
    return [];
  }
}

function setOfflineQueue(queue: OfflineQueueItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
}

function enqueueOffline(event: string, data: any): void {
  const queue = getOfflineQueue();
  queue.push({ event, data, timestamp: Date.now() });
  setOfflineQueue(queue);
}

function flushOfflineQueue(): void {
  if (!socket || !socket.connected) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const sorted = queue.sort((a, b) => a.timestamp - b.timestamp);
  for (const item of sorted) {
    socket.emit(item.event, item.data, (resp: any) => {
      if (!resp?.ok) console.warn('offline queue send failed:', item.event, resp?.error);
    });
  }
  setOfflineQueue([]);
}

export function sendOffline(event: string, data: any): void {
  if (socket && socket.connected) {
    socket.emit(event, data, (resp: any) => {
      if (!resp?.ok) {
        console.warn('send failed, queuing offline:', event, resp?.error);
        enqueueOffline(event, data);
      }
    });
  } else {
    enqueueOffline(event, data);
  }
}

function getLastSeenMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LAST_SEEN) || '{}');
  } catch {
    return {};
  }
}

function saveLastSeenMap(map: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LAST_SEEN, JSON.stringify(map));
}

export function setLastSeenMessage(roomId: string, messageId: string): void {
  const map = getLastSeenMap();
  map[roomId] = messageId;
  saveLastSeenMap(map);
}

export function getLastSeenMessages(): Record<string, string> {
  return getLastSeenMap();
}

export function onReconnect(callback: () => void): void {
  onReconnectCallback = callback;
}

export function connectSocket(accessToken: string): Socket | null {
  if (typeof window === 'undefined') return null;

  if (socket && (socket.auth as any)?.token === accessToken) {
    if (socket.connected || socket.active) return socket;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SERVER_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    flushOfflineQueue();
    if (onReconnectCallback) {
      onReconnectCallback();
    }
  });

  socket.on('connect_error', async (err: Error) => {
    if (err.message === 'unauthorized' || err.message === 'user not found') {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return;
      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        if (data.error && data.error.includes('reuse detected')) return;
        setTokens(data.accessToken, data.refreshToken);
        // Force a full disconnect+reconnect with the fresh token
        if (socket) {
          (socket.auth as any).token = data.accessToken;
          socket.disconnect().connect();
        }
      } catch {
        socket?.disconnect();
      }
    }
  });

  return socket;
}

export function updateSocketToken(newToken: string): void {
  if (!socket) return;
  (socket.auth as any).token = newToken;
  if (!socket.connected) {
    socket.connect();
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  onReconnectCallback = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('app:hard-logout', () => {
    disconnectSocket();
  });
}
