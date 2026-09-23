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

export function isSocketConnected(): boolean {
  return Boolean(socket && socket.connected);
}

function flushOfflineQueue(): void {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const sorted = queue.sort((a, b) => a.timestamp - b.timestamp);
  const remaining: OfflineQueueItem[] = [];

  for (const item of sorted) {
    if (socket && socket.connected) {
      socket.emit(item.event, item.data, (resp: any) => {
        if (!resp?.ok) console.warn('offline queue send failed:', item.event, resp?.error);
      });
    } else if (item.event === 'message:send' && item.data?.roomId) {
      // Drain via HTTP when socket is not available
      api
        .post(`/rooms/${item.data.roomId}/messages`, item.data)
        .catch((err) => {
          console.warn('HTTP offline queue flush failed:', err.message);
          remaining.push(item);
        });
    } else {
      remaining.push(item);
    }
  }
  setOfflineQueue(remaining);
}

export function sendOffline(event: string, data: any): void {
  if (socket && socket.connected) {
    socket.emit(event, data, (resp: any) => {
      if (!resp?.ok) {
        console.warn('send failed, queuing offline:', event, resp?.error);
        enqueueOffline(event, data);
      }
    });
  } else if (event === 'message:send' && data?.roomId) {
    // Send via HTTP REST fallback instead of silently stalling in queue
    api
      .post(`/rooms/${data.roomId}/messages`, data)
      .catch((err) => {
        console.warn('HTTP fallback send failed, queuing offline:', err.message);
        enqueueOffline(event, data);
      });
  } else {
    enqueueOffline(event, data);
  }
}

/**
 * Dual-transport sender for Room messages:
 * Tries Socket.IO first with 2.5s timeout, falls back to HTTP REST API.
 */
export async function sendRoomMessage(payload: any): Promise<any> {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          api
            .post(`/rooms/${payload.roomId}/messages`, payload)
            .then((res) => resolve(res.data?.message || res.data))
            .catch(reject);
        }
      }, 2500);

      currentSocket.emit('message:send', payload, (resp: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (resp?.ok && resp?.message) {
          resolve(resp.message);
        } else if (resp?.error) {
          reject(new Error(resp.error));
        } else {
          api
            .post(`/rooms/${payload.roomId}/messages`, payload)
            .then((res) => resolve(res.data?.message || res.data))
            .catch(reject);
        }
      });
    });
  }

  const res = await api.post(`/rooms/${payload.roomId}/messages`, payload);
  return res.data?.message || res.data;
}

/**
 * Dual-transport sender for Direct Messages:
 * Tries Socket.IO first with 2.5s timeout, falls back to HTTP REST API.
 */
export async function sendDMMessageHttp(roomId: string, payload: any): Promise<any> {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          api
            .post(`/dm/${roomId}/messages`, payload)
            .then((res) => resolve(res.data?.message || res.data))
            .catch(reject);
        }
      }, 2500);

      currentSocket.emit('message:send', { roomId, ...payload }, (resp: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (resp?.ok && resp?.message) {
          resolve(resp.message);
        } else if (resp?.error) {
          reject(new Error(resp.error));
        } else {
          api
            .post(`/dm/${roomId}/messages`, payload)
            .then((res) => resolve(res.data?.message || res.data))
            .catch(reject);
        }
      });
    });
  }

  const res = await api.post(`/dm/${roomId}/messages`, payload);
  return res.data?.message || res.data;
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
