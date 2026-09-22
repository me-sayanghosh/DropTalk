import redis from '../config/redis';

export async function checkSocketRateLimit(userId, action, { windowMs = 60000, max = 30 } = {}) {
  const key = `ratelimit:socket:${action}:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}:${Math.random()}`);
    multi.zcard(key);
    multi.pexpire(key, windowMs);
    const results = await multi.exec();
    const count = results[2][1];
    return count <= max;
  } catch (err) {
    console.error('[ratelimit] redis error:', err.message);
    return true;
  }
}
