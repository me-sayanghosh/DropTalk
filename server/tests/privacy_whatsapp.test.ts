import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo, randomSuffix } from './setup';
import { User } from '../src/features/auth/user.model';
import { Room } from '../src/features/rooms/room.model';
import { Notification } from '../src/features/notifications/notification.model';
import authRoutes from '../src/features/auth/auth.routes';
import dmRoutes from '../src/features/dm/dm.routes';
import callsRoutes from '../src/features/calls/calls.routes';
import messagesRoutes from '../src/features/messages/messages.routes';
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
  app.use('/api/rooms', messagesRoutes);

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

  test('Call logging with roomId only (without receiverId) still enforces blocking in DM rooms', async () => {
    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    // Create DM room between Alice and Bob
    const dmRoom = await Room.create({
      name: `dm-${alice._id}-${bob._id}`,
      createdBy: alice._id,
      isDM: true,
      dmStatus: 'accepted',
      members: [
        { user: alice._id, role: 'member' },
        { user: bob._id, role: 'member' },
      ],
    });

    // Alice blocks Bob
    await request('POST', '/api/auth/block-user', aliceToken, {
      targetUserId: bob._id.toString(),
    });

    // Bob logs a call providing only roomId
    const callRes = await request('POST', '/api/calls/log', bobToken, {
      roomId: dmRoom._id.toString(),
      type: 'voice',
      status: 'completed',
      durationSeconds: 30,
    });

    expect(callRes.status).toBe(403);
    expect(callRes.body.error).toMatch(/cannot call this user/i);
  });

  test('Blocked user cannot send message in existing DM via POST /api/dm/:roomId/messages (403 forbidden)', async () => {
    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    // Existing accepted DM room
    const dmRoom = await Room.create({
      name: `dm-${alice._id}-${bob._id}`,
      createdBy: alice._id,
      isDM: true,
      dmStatus: 'accepted',
      members: [
        { user: alice._id, role: 'member' },
        { user: bob._id, role: 'member' },
      ],
    });

    // Alice blocks Bob
    await request('POST', '/api/auth/block-user', aliceToken, {
      targetUserId: bob._id.toString(),
    });

    // Bob attempts to message Alice in the existing DM room
    const msgRes = await request('POST', `/api/dm/${dmRoom._id}/messages`, bobToken, {
      text: 'Bypassing block in existing DM room',
    });

    expect(msgRes.status).toBe(403);
    expect(msgRes.body.error).toMatch(/cannot message this user/i);

    // Alice also cannot message Bob without unblocking
    const aliceSendRes = await request('POST', `/api/dm/${dmRoom._id}/messages`, aliceToken, {
      text: 'Trying to reach Bob while having him blocked',
    });
    expect(aliceSendRes.status).toBe(400);
    expect(aliceSendRes.body.error).toMatch(/have blocked this user/i);
  });

  test('Blocked user cannot send message via general messages route POST /api/messages/:roomId in DM room', async () => {
    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    const dmRoom = await Room.create({
      name: `dm-${alice._id}-${bob._id}`,
      createdBy: alice._id,
      isDM: true,
      dmStatus: 'accepted',
      members: [
        { user: alice._id, role: 'member' },
        { user: bob._id, role: 'member' },
      ],
    });

    // Alice blocks Bob
    await request('POST', '/api/auth/block-user', aliceToken, {
      targetUserId: bob._id.toString(),
    });

    // Bob calls /api/rooms/:roomId/messages
    const msgRes = await request('POST', `/api/rooms/${dmRoom._id}/messages`, bobToken, {
      text: 'Trying /api/rooms/:roomId/messages route in DM',
    });

    expect(msgRes.status).toBe(403);
    expect(msgRes.body.error).toMatch(/cannot message this user/i);
  });

  test('Blocked user cannot accept a pending DM request via POST /api/dm/:roomId/accept', async () => {
    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    const pendingRoom = await Room.create({
      name: `dm-${alice._id}-${bob._id}`,
      createdBy: alice._id,
      isDM: true,
      dmStatus: 'pending',
      dmInitiator: alice._id,
      members: [
        { user: alice._id, role: 'member' },
        { user: bob._id, role: 'member' },
      ],
    });

    // Alice blocks Bob
    await request('POST', '/api/auth/block-user', aliceToken, {
      targetUserId: bob._id.toString(),
    });

    // Bob tries to accept
    const acceptRes = await request('POST', `/api/dm/${pendingRoom._id}/accept`, bobToken);
    expect(acceptRes.status).toBe(403);
  });

  test('GET /api/auth/users/search sanitizes profilePhoto and customStatus according to privacy settings and blocks', async () => {
    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    alice.profileImage = 'https://droptalk.app/avatar/alice.png';
    alice.customStatus = { emoji: '🔒', text: 'Top Secret Status' };
    alice.privacySettings.profilePhoto = 'nobody';
    alice.privacySettings.about = 'nobody';
    await alice.save();

    // Bob searches for Alice
    const res = await request('GET', `/api/auth/users/search?q=${alice.username}`, bobToken);
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBe(1);
    const foundAlice = res.body.users[0];
    expect(foundAlice.profileImage).toBe('');
    expect(foundAlice.customStatus.text).toBe('');

    // If Alice resets privacy but blocks Bob:
    alice.privacySettings.profilePhoto = 'everyone';
    alice.privacySettings.about = 'everyone';
    alice.privacySettings.blockedUsers = [bob._id];
    await alice.save();

    const res2 = await request('GET', `/api/auth/users/search?q=${alice.username}`, bobToken);
    expect(res2.status).toBe(200);
    const foundAlice2 = res2.body.users[0];
    expect(foundAlice2.profileImage).toBe('');
    expect(foundAlice2.customStatus.text).toBe('');
  });

  test('GET /api/dm/conversations sanitizes partner profileImage when partner blocked user or has profilePhoto: nobody', async () => {
    const bobToken = makeToken(bob);

    alice.profileImage = 'https://droptalk.app/avatar/alice.png';
    alice.privacySettings.blockedUsers = [bob._id];
    await alice.save();

    await Room.create({
      name: `dm-${alice._id}-${bob._id}`,
      createdBy: alice._id,
      isDM: true,
      dmStatus: 'accepted',
      members: [
        { user: alice._id, role: 'member' },
        { user: bob._id, role: 'member' },
      ],
    });

    const res = await request('GET', '/api/dm/conversations', bobToken);
    expect(res.status).toBe(200);
    expect(res.body.conversations.length).toBe(1);
    expect(res.body.conversations[0].partner.profileImage).toBe('');
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

  test('DELETE /api/auth/delete-account permanently deletes account and cleans up memberships, notifications, and blocks', async () => {
    const aliceToken = makeToken(alice);

    // Alice is in a room and has notifications and is blocked by Bob
    const room = await Room.create({
      name: 'general_alice',
      createdBy: bob._id,
      members: [
        { user: alice._id, role: 'member' },
        { user: bob._id, role: 'owner' },
      ],
      encryptedKeys: [{ user: alice._id, key: 'abc', keyId: '1' }],
    });

    const dmRoom = await Room.create({
      name: `dm-${alice._id}-${bob._id}`,
      createdBy: alice._id,
      isDM: true,
      members: [
        { user: alice._id, role: 'member' },
        { user: bob._id, role: 'member' },
      ],
    });

    await Notification.create({
      user: alice._id,
      type: 'system',
      title: 'Welcome Alice',
    });

    bob.privacySettings.blockedUsers = [alice._id];
    await bob.save();

    const res = await request('DELETE', '/api/auth/delete-account', aliceToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const checkUser = await User.findById(alice._id);
    expect(checkUser).toBeNull();

    // Verify room pulled alice
    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.members.some((m) => m.user.toString() === alice._id.toString())).toBe(false);
    expect(updatedRoom?.encryptedKeys.some((k) => k.user.toString() === alice._id.toString())).toBe(false);

    // Verify DM room deleted
    const updatedDmRoom = await Room.findById(dmRoom._id);
    expect(updatedDmRoom).toBeNull();

    // Verify notifications deleted
    const notifs = await Notification.find({ user: alice._id });
    expect(notifs.length).toBe(0);

    // Verify pulled from bob's blocked users
    const updatedBob = await User.findById(bob._id);
    expect(updatedBob?.privacySettings.blockedUsers.some((id: any) => id.toString() === alice._id.toString())).toBe(false);
  });
});
