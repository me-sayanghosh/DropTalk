import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo, randomSuffix } from './setup';
import { User } from '../src/features/auth/user.model';
import { Room } from '../src/features/rooms/room.model';
import authRoutes from '../src/features/auth/auth.routes';
import dmRoutes from '../src/features/dm/dm.routes';
import callsRoutes from '../src/features/calls/calls.routes';
import { JWT_SECRET } from '../src/shared/utils/constants';

let app: express.Express;
let server: http.Server;
let port: number;
let alice: any;
let bob: any;
let charlie: any;

function makeToken(user: any) {
  return jwt.sign({ sub: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '15m' });
}

function request(method: string, path: string, token?: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

beforeAll(async () => {
  await setupMongo();
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/dm', dmRoutes);
  app.use('/api/calls', callsRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      port = (server.address() as any).port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await teardownMongo();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Room.deleteMany({});

  const s = Math.random().toString(36).slice(2, 8);
  alice = await User.create({
    username: `al_${s}`,
    email: `al_${s}@test.com`,
  });

  bob = await User.create({
    username: `bob_${s}`,
    email: `bob_${s}@test.com`,
  });

  charlie = await User.create({
    username: `ch_${s}`,
    email: `ch_${s}@test.com`,
  });
});

describe('WhatsApp Privacy & Security API', () => {
  test('PUT /api/auth/privacy-settings updates WhatsApp privacy fields', async () => {
    const aliceToken = makeToken(alice);
    const res = await request('PUT', '/api/auth/privacy-settings', aliceToken, {
      readReceipts: false,
      lastSeen: 'nobody',
      online: 'same_as_last_seen',
      disappearingTimer: '24h',
      showOnlineStatus: false,
      showProfilePicture: false,
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.privacySettings.readReceipts).toBe(false);
    expect(res.body.user.privacySettings.lastSeen).toBe('nobody');
    expect(res.body.user.privacySettings.online).toBe('same_as_last_seen');
    expect(res.body.user.privacySettings.disappearingTimer).toBe('24h');
    expect(res.body.user.privacySettings.showOnlineStatus).toBe(false);
    expect(res.body.user.privacySettings.showProfilePicture).toBe(false);
  });

  test('POST /api/auth/block-user blocks user by ID and prevents self-blocking', async () => {
    const aliceToken = makeToken(alice);

    // Self-blocking should be rejected
    const selfRes = await request('POST', '/api/auth/block-user', aliceToken, {
      targetUserId: alice._id.toString(),
    });
    expect(selfRes.status).toBe(400);

    // Block Bob by ID
    const blockRes = await request('POST', '/api/auth/block-user', aliceToken, {
      targetUserId: bob._id.toString(),
    });
    expect(blockRes.status).toBe(200);
    expect(blockRes.body.ok).toBe(true);
    expect(blockRes.body.blockedUsers.length).toBe(1);
    expect(blockRes.body.blockedUsers[0].username).toBe(bob.username);
  });

  test('POST /api/auth/block-user blocks user by @username and fetches via GET /api/auth/blocked-users', async () => {
    const aliceToken = makeToken(alice);

    // Block Charlie by username
    const blockRes = await request('POST', '/api/auth/block-user', aliceToken, {
      targetUsername: `@${charlie.username}`,
    });
    expect(blockRes.status).toBe(200);
    expect(blockRes.body.ok).toBe(true);

    // Fetch blocked users
    const getRes = await request('GET', '/api/auth/blocked-users', aliceToken);
    expect(getRes.status).toBe(200);
    expect(getRes.body.ok).toBe(true);
    expect(getRes.body.blockedUsers.length).toBe(1);
    expect(getRes.body.blockedUsers[0].username).toBe(charlie.username);

    // Unblock Charlie
    const unblockRes = await request('POST', '/api/auth/unblock-user', aliceToken, {
      targetUserId: charlie._id.toString(),
    });
    expect(unblockRes.status).toBe(200);
    expect(unblockRes.body.ok).toBe(true);
    expect(unblockRes.body.blockedUsers.length).toBe(0);
  });

  test('Blocked user cannot send DM to user who blocked them (403 forbidden)', async () => {
    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    // Alice blocks Bob
    await request('POST', '/api/auth/block-user', aliceToken, {
      targetUserId: bob._id.toString(),
    });

    // Bob attempts to send DM to Alice
    const dmRes = await request('POST', '/api/dm/send', bobToken, {
      toUserId: alice._id.toString(),
      text: 'Hey Alice, are you there?',
    });

    expect(dmRes.status).toBe(403);
    expect(dmRes.body.error).toMatch(/cannot message this user/i);
  });

  test('User who blocked another cannot send DM until unblocking (400 bad request)', async () => {
    const aliceToken = makeToken(alice);

    // Alice blocks Bob
    await request('POST', '/api/auth/block-user', aliceToken, {
      targetUserId: bob._id.toString(),
    });

    // Alice tries to send DM to Bob
    const dmRes = await request('POST', '/api/dm/send', aliceToken, {
      toUserId: bob._id.toString(),
      text: 'Trying to reach Bob',
    });

    expect(dmRes.status).toBe(400);
    expect(dmRes.body.error).toMatch(/have blocked this user/i);
  });

  test('Blocked user cannot log or initiate calls with user who blocked them', async () => {
    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    // Alice blocks Bob
    await request('POST', '/api/auth/block-user', aliceToken, {
      targetUserId: bob._id.toString(),
    });

    // Bob tries to log a call to Alice
    const callRes = await request('POST', '/api/calls/log', bobToken, {
      receiverId: alice._id.toString(),
      type: 'voice',
      status: 'completed',
      durationSeconds: 12,
    });

    expect(callRes.status).toBe(403);
    expect(callRes.body.error).toMatch(/cannot call this user/i);
  });

  test('GET /api/auth/export-data downloads user GDPR data package', async () => {
    const aliceToken = makeToken(alice);
    const res = await request('GET', '/api/auth/export-data', aliceToken);

    expect(res.status).toBe(200);
    expect(res.body.compliance).toMatch(/GDPR/);
    expect(res.body.user.username).toBe(alice.username);
    expect(res.body.user.email).toBe(alice.email);
    expect(res.body.activityMetrics).toBeDefined();
  });

  test('DELETE /api/auth/delete-account permanently deletes account', async () => {
    const aliceToken = makeToken(alice);
    const res = await request('DELETE', '/api/auth/delete-account', aliceToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const check = await User.findById(alice._id);
    expect(check).toBeNull();
  });
});
