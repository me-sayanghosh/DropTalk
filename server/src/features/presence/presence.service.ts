import redis from '../../shared/config/redis';
import { PRESENCE } from '../../shared/utils/constants';

const PRESENCE_KEY = 'presence';
const ONLINE_SET = 'presence:online';
const CONN_COUNT_KEY = 'presence:connCount';
const HEARTBEAT_TTL_MS = PRESENCE.HEARTBEAT_TTL_MS;
const HEARTBEAT_REFRESH_MS = PRESENCE.HEARTBEAT_REFRESH_MS;

export async function setPresence(userId: string, { status = 'online', currentRoom = null }: any) {
  const data = { status, currentRoom, lastSeen: Date.now() };
  await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
  if (status === 'online') {
    await redis.sadd(ONLINE_SET, userId);
  } else {
    await redis.srem(ONLINE_SET, userId);
  }
}

export async function incrementPresence(userId: string, socketId: string) {
  const hbKey = `presence:heartbeat:${userId}:${socketId}`;
  await redis.set(hbKey, '1', 'PX', HEARTBEAT_TTL_MS);

  const count = await redis.incr(`${CONN_COUNT_KEY}:${userId}`);
  if (count === 1) {
    const data = { status: 'online', currentRoom: null, lastSeen: Date.now() };
    await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
    await redis.sadd(ONLINE_SET, userId);
  }
  return count;
}

export function startHeartbeat(userId: string, socketId: string) {
  const hbKey = `presence:heartbeat:${userId}:${socketId}`;
  const interval = setInterval(async () => {
    try {
      await redis.set(hbKey, '1', 'PX', HEARTBEAT_TTL_MS);
    } catch {
      // ignore heartbeat errors
    }
  }, HEARTBEAT_REFRESH_MS);
  return interval;
}

export async function decrementPresence(userId: string, socketId?: string) {
  if (socketId) {
    const hbKey = `presence:heartbeat:${userId}:${socketId}`;
    await redis.del(hbKey);
  }

  const count = await redis.decr(`${CONN_COUNT_KEY}:${userId}`);
  if (count <= 0) {
    await redis.del(`${CONN_COUNT_KEY}:${userId}`);
    const raw = await redis.hget(PRESENCE_KEY, userId);
    if (raw) {
      const data = JSON.parse(raw);
      data.status = 'offline';
      data.lastSeen = Date.now();
      data.currentRoom = null;
      await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
    }
    await redis.srem(ONLINE_SET, userId);
    return 0;
  }
  return count;
}

export async function reconcilePresence() {
  const onlineIds = await redis.smembers(ONLINE_SET);
  if (!onlineIds || onlineIds.length === 0) return;

  for (const userId of onlineIds) {
    const connCount = await redis.get(`${CONN_COUNT_KEY}:${userId}`);
    if (!connCount || parseInt(connCount, 10) <= 0) {
      const data = await getPresence(userId);
      if (data && data.status === 'online') {
        data.status = 'offline';
        data.lastSeen = Date.now();
        data.currentRoom = null;
        await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
        await redis.srem(ONLINE_SET, userId);
        await redis.del(`${CONN_COUNT_KEY}:${userId}`);
      }
    }
  }
}

export async function getPresence(userId: string) {
  const raw = await redis.hget(PRESENCE_KEY, userId);
  return raw ? JSON.parse(raw) : null;
}

export async function getPresenceMap() {
  const onlineIds = await redis.smembers(ONLINE_SET);
  if (!onlineIds || onlineIds.length === 0) return {};

  const raw = await redis.hmget(PRESENCE_KEY, ...onlineIds);
  const map: Record<string, any> = {};
  for (let i = 0; i < onlineIds.length; i++) {
    if (raw[i]) {
      map[onlineIds[i]] = JSON.parse(raw[i]);
    }
  }
  return map;
}

export async function setUserCurrentRoom(userId: string, roomId: string) {
  const data = await getPresence(userId);
  if (data) {
    data.currentRoom = roomId;
    data.lastSeen = Date.now();
    await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
  }
}

export async function clearUserCurrentRoom(userId: string) {
  const data = await getPresence(userId);
  if (data) {
    data.currentRoom = null;
    data.lastSeen = Date.now();
    await redis.hset(PRESENCE_KEY, userId, JSON.stringify(data));
  }
}

// O(1) Typing state management via scoped Redis hashes per room
export async function setTyping(roomId: string, userId: string, ttlMs = 3000) {
  const hashKey = `typing:${roomId}`;
  const expireAt = Date.now() + ttlMs;
  await redis.hset(hashKey, userId, String(expireAt));
  await redis.expire(hashKey, Math.ceil(ttlMs / 1000) + 5);
}

export async function getTypingUsers(roomId: string) {
  const hashKey = `typing:${roomId}`;
  const entries = await redis.hgetall(hashKey);
  if (!entries || Object.keys(entries).length === 0) return [];

  const now = Date.now();
  const activeUsers: string[] = [];
  const expiredUsers: string[] = [];

  for (const [userId, expireAtStr] of Object.entries(entries)) {
    if (Number(expireAtStr) > now) {
      activeUsers.push(userId);
    } else {
      expiredUsers.push(userId);
    }
  }

  if (expiredUsers.length > 0) {
    redis.hdel(hashKey, ...expiredUsers).catch(() => {});
  }

  return activeUsers;
}

export async function removeTyping(roomId: string, userId: string) {
  await redis.hdel(`typing:${roomId}`, userId);
}
