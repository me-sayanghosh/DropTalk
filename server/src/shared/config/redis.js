import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redis;
let usingFallback = false;

/**
 * Lightweight in-memory fallback that mirrors the tiny slice of the ioredis
 * API actually used by the app (hset, hget, hmget, sadd, srem, smembers,
 * set, get, del, incr, decr, scan, zadd, zcard, zremrangebyscore, pexpire,
 * multi, duplicate, quit, disconnect).
 *
 * This is NOT a production-grade Redis replacement — it simply lets the
 * server boot and run locally when Redis is not installed.
 */
class InMemoryRedis {
  constructor() {
    this._kv = new Map();      // key → value (string / number)
    this._hash = new Map();    // key → Map(field → value)
    this._set = new Map();     // key → Set(member)
    this._zset = new Map();    // key → Map(member → score)
    this._timers = new Map();  // key → timeoutId
  }

  /* ── helpers ── */
  _expire(key, ms) {
    if (this._timers.has(key)) clearTimeout(this._timers.get(key));
    this._timers.set(key, setTimeout(() => {
      this._kv.delete(key);
      this._hash.delete(key);
      this._set.delete(key);
      this._zset.delete(key);
      this._timers.delete(key);
    }, ms));
  }

  /* ── string commands ── */
  async set(key, value, ...args) {
    this._kv.set(key, String(value));
    // handle PX ttl: set key value PX <ms>
    const pxIdx = args.indexOf('PX');
    if (pxIdx !== -1 && args[pxIdx + 1] != null) {
      this._expire(key, Number(args[pxIdx + 1]));
    }
    return 'OK';
  }
  async get(key) { return this._kv.get(key) ?? null; }
  async del(...keys) {
    let count = 0;
    for (const k of keys) {
      if (this._kv.delete(k) || this._hash.delete(k) || this._set.delete(k) || this._zset.delete(k)) count++;
      if (this._timers.has(k)) { clearTimeout(this._timers.get(k)); this._timers.delete(k); }
    }
    return count;
  }
  async incr(key) {
    const v = (parseInt(this._kv.get(key) || '0', 10) || 0) + 1;
    this._kv.set(key, String(v));
    return v;
  }
  async decr(key) {
    const v = (parseInt(this._kv.get(key) || '0', 10) || 0) - 1;
    this._kv.set(key, String(v));
    return v;
  }

  /* ── hash commands ── */
  async hset(key, field, value) {
    if (!this._hash.has(key)) this._hash.set(key, new Map());
    this._hash.get(key).set(field, value);
    return 1;
  }
  async hget(key, field) { return this._hash.get(key)?.get(field) ?? null; }
  async hmget(key, ...fields) {
    const m = this._hash.get(key);
    return fields.map(f => m?.get(f) ?? null);
  }

  /* ── set commands ── */
  async sadd(key, ...members) {
    if (!this._set.has(key)) this._set.set(key, new Set());
    const s = this._set.get(key);
    let added = 0;
    for (const m of members) { if (!s.has(m)) { s.add(m); added++; } }
    return added;
  }
  async srem(key, ...members) {
    const s = this._set.get(key);
    if (!s) return 0;
    let removed = 0;
    for (const m of members) { if (s.delete(m)) removed++; }
    return removed;
  }
  async smembers(key) { return [...(this._set.get(key) || [])]; }

  /* ── sorted set commands ── */
  async zadd(key, score, member) {
    if (!this._zset.has(key)) this._zset.set(key, new Map());
    this._zset.get(key).set(member, score);
    return 1;
  }
  async zcard(key) { return this._zset.get(key)?.size ?? 0; }
  async zremrangebyscore(key, min, max) {
    const m = this._zset.get(key);
    if (!m) return 0;
    let removed = 0;
    for (const [member, score] of m) {
      if (score >= min && score <= max) { m.delete(member); removed++; }
    }
    return removed;
  }
  async pexpire(key, ms) { this._expire(key, ms); return 1; }

  /* ── scan (simplified) ── */
  async scan(cursor, _match, pattern, _count, _countVal) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const allKeys = [
      ...this._kv.keys(),
      ...this._hash.keys(),
      ...this._set.keys(),
      ...this._zset.keys(),
    ];
    const matched = allKeys.filter(k => regex.test(k));
    return ['0', matched];
  }

  /* ── multi / pipeline ── */
  multi() {
    const commands = [];
    const self = this;
    const chain = new Proxy({}, {
      get(_target, prop) {
        if (prop === 'exec') {
          return async () => {
            const results = [];
            for (const [method, args] of commands) {
              try {
                const result = await self[method](...args);
                results.push([null, result]);
              } catch (err) {
                results.push([err, null]);
              }
            }
            return results;
          };
        }
        return (...args) => {
          commands.push([prop, args]);
          return chain;
        };
      },
    });
    return chain;
  }

  /* ── connection stubs ── */
  duplicate() { return this; }
  on(_event, _fn) { return this; }
  async quit() {}
  disconnect() {}
}

try {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;           // stop retrying after 3 attempts
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,                      // don't connect until first command
  });

  // Register error handler BEFORE connecting to prevent unhandled error events
  redis.on('error', () => {});

  // Attempt connection — if it fails, fall back to in-memory
  await redis.connect().catch(() => {
    throw new Error('Redis unavailable');
  });

  // Replace the no-op handler with a real one
  redis.removeAllListeners('error');
  redis.on('error', (err) => console.error('[redis] error:', err.message));
  console.log('[redis] connected');
} catch {
  // Clean up the failed ioredis instance to stop retry loops
  if (redis && typeof redis.disconnect === 'function') {
    try { redis.disconnect(); } catch {}
  }
  console.warn('[redis] not available — using in-memory fallback (fine for local dev)');
  redis = new InMemoryRedis();
  usingFallback = true;
}

export { usingFallback };
export default redis;
