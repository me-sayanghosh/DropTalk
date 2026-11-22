import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import redis from '../src/shared/config/redis';
import {
  setTyping,
  getTypingUsers,
  removeTyping,
  setPresence,
  getPresence,
  incrementPresence,
  decrementPresence,
  reconcilePresence,
} from '../src/features/presence/presence.service';
import { setupMongo, teardownMongo } from './setup';

beforeAll(async () => {
  await setupMongo();
});

afterAll(async () => {
  await teardownMongo();
});

describe('Presence & Redis In-Memory Fallback Operations', () => {
  test('typing indicator operations: setTyping, getTypingUsers, removeTyping', async () => {
    const roomId = 'room_typing_test';
    const userA = 'user_a';
    const userB = 'user_b';

    await setTyping(roomId, userA, 5000);
    await setTyping(roomId, userB, 5000);

    let active = await getTypingUsers(roomId);
    expect(active).toContain(userA);
    expect(active).toContain(userB);

    await removeTyping(roomId, userA);
    active = await getTypingUsers(roomId);
    expect(active).not.toContain(userA);
    expect(active).toContain(userB);
  });

  test('presence state: incrementPresence, getPresence, decrementPresence', async () => {
    const userId = 'user_pres_1';
    const socketId = 'sock_1';

    const count = await incrementPresence(userId, socketId);
    expect(count).toBe(1);

    const pres = await getPresence(userId);
    expect(pres).not.toBeNull();
    expect(pres.status).toBe('online');

    const remaining = await decrementPresence(userId, socketId);
    expect(remaining).toBe(0);

    const afterPres = await getPresence(userId);
    expect(afterPres.status).toBe('offline');
  });

  test('reconcilePresence cleans up dead connections without error', async () => {
    await expect(reconcilePresence()).resolves.not.toThrow();
  });
});
