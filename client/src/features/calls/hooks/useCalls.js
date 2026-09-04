import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../shared/utils/api.js';

/**
 * Collapse near-identical call logs.
 * Two logs are considered duplicates when they share the same
 * partner id + call type + status and were created within 60 seconds
 * of each other. The most recent entry in each group is kept.
 * Logs are assumed to arrive sorted newest-first.
 */
function deduplicateLogs(logs) {
  const seen = new Map(); // key → log
  const result = [];

  for (const log of logs) {
    const partnerId = log.partner?.id || log.receiverId || '_none';
    const ts = new Date(log.createdAt).getTime();
    // Round timestamp to the nearest 60-second bucket
    const bucket = Math.floor(ts / 60000);
    const key = `${partnerId}::${log.type}::${log.status}::${bucket}`;

    // Also check the adjacent bucket (±1 min) to catch entries that straddle
    // a bucket boundary (e.g. 23:39:58 and 23:40:02)
    const keyPrev = `${partnerId}::${log.type}::${log.status}::${bucket - 1}`;
    const keyNext = `${partnerId}::${log.type}::${log.status}::${bucket + 1}`;

    if (seen.has(key) || seen.has(keyPrev) || seen.has(keyNext)) {
      continue; // duplicate — skip
    }

    seen.set(key, log);
    result.push(log);
  }

  return result;
}

export function useCalls(user) {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const recentLogRef = useRef(null);

  const fetchCallLogs = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get('/calls/history');
      const fetched = res.data.logs || [];
      setCallLogs(deduplicateLogs(fetched));
    } catch (err) {
      console.warn('Failed to fetch call logs:', err);
      setCallLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCallLogs();
  }, [fetchCallLogs]);

  const addCallLog = useCallback(async ({ receiverId, roomId, type = 'voice', status = 'completed', durationSeconds = 0 }) => {
    try {
      // Guard against rapid-fire duplicate clicks (same target within 5 s)
      const now = Date.now();
      const recent = recentLogRef.current;
      if (
        recent &&
        recent.receiverId === (receiverId || null) &&
        recent.roomId === (roomId || null) &&
        recent.type === type &&
        now - recent.timestamp < 5000
      ) {
        return;
      }
      recentLogRef.current = { receiverId: receiverId || null, roomId: roomId || null, type, timestamp: now };

      const res = await api.post('/calls/log', {
        receiverId,
        roomId,
        type,
        status,
        durationSeconds,
      });
      if (res.data.log) {
        setCallLogs((prev) => {
          // Avoid duplicate by ID (e.g. if fetchCallLogs ran concurrently)
          if (prev.some((l) => l.id === res.data.log.id)) return prev;
          return deduplicateLogs([res.data.log, ...prev]);
        });
      }
    } catch (err) {
      console.error('Failed to log call:', err);
    }
  }, []);

  const clearCallHistory = useCallback(async () => {
    try {
      await api.delete('/calls/history');
      setCallLogs([]);
    } catch (err) {
      console.error('Failed to clear call history:', err);
      setCallLogs([]);
    }
  }, []);

  return {
    callLogs,
    loading,
    fetchCallLogs,
    addCallLog,
    clearCallHistory,
  };
}

