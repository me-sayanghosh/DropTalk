import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo, randomSuffix } from './setup';
import { User } from '../src/features/auth/user.model';
import { Room } from '../src/features/rooms/room.model';
import { Message } from '../src/features/messages/message.model';
import { Status } from '../src/features/status/status.model';
import roomRoutes from '../src/features/rooms/rooms.routes';
import messageRoutes from '../src/features/messages/messages.routes';
import { statusRouter } from '../src/features/status/status.routes';
import { JWT_SECRET } from '../src/shared/utils/constants';

let app: express.Express;
let server: http.Server;
let port: number;
let userA: any;
let userB: any;
let userC: any;

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
  app.use('/api/rooms', roomRoutes);
  app.use('/api/rooms', messageRoutes);
  app.use('/api/status', statusRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await teardownMongo();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Room.deleteMany({});
  await Message.deleteMany({});
  await Status.deleteMany({});

  const sfx = randomSuffix().slice(-6);
  userA = await User.create({
    username: `ua_${sfx}`,
    email: `ua_${sfx}@test.local`,
    name: 'User A',
  });
  userB = await User.create({
    username: `ub_${sfx}`,
    email: `ub_${sfx}@test.local`,
    name: 'User B',
  });
  userC = await User.create({
    username: `uc_${sfx}`,
    email: `uc_${sfx}@test.local`,
    name: 'User C',
  });
});

describe('WhatsApp Status & Stories API', () => {
  test('POST /api/status/create creates 24h disappearing status', async () => {
    const res = await request('POST', '/api/status/create', makeToken(userA), {
      mediaUrl: 'https://example.com/status.jpg',
      mediaType: 'image',
      caption: 'My WhatsApp Status Update',
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBeDefined();
    expect(res.body.status.mediaUrl).toBe('https://example.com/status.jpg');
    expect(res.body.status.caption).toBe('My WhatsApp Status Update');
    expect(new Date(res.body.status.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('GET /api/status/feed lists active statuses and filters blocked users bidirectionally', async () => {
    await Status.create({
      user: userA._id,
      mediaUrl: 'https://example.com/status1.jpg',
      caption: 'From Alice',
    });
    await Status.create({
      user: userB._id,
      mediaUrl: 'https://example.com/status2.jpg',
      caption: 'From Bob',
    });

    // Bob blocked Alice
    userB.privacySettings = { blockedUsers: [userA._id] };
    await userB.save();

    // Bob should not see Alice's status
    const resBob = await request('GET', '/api/status/feed', makeToken(userB));
    expect(resBob.status).toBe(200);
    expect(resBob.body.statuses.length).toBe(1);
    expect(resBob.body.statuses[0].caption).toBe('From Bob');

    // Alice also should not see Bob's status because Bob blocked Alice (bidirectional)
    const resAlice = await request('GET', '/api/status/feed', makeToken(userA));
    expect(resAlice.status).toBe(200);
    expect(resAlice.body.statuses.length).toBe(1);
    expect(resAlice.body.statuses[0].caption).toBe('From Alice');
  });

  test('POST /api/status/:id/view records viewer count and blocks unauthorized/blocked viewers', async () => {
    const status = await Status.create({
      user: userA._id,
      mediaUrl: 'https://example.com/status1.jpg',
    });

    // Bob views Alice's status
    const res = await request('POST', `/api/status/${status._id}/view`, makeToken(userB));
    expect(res.status).toBe(200);
    expect(res.body.viewersCount).toBe(1);

    // Duplicate view does not double count
    const res2 = await request('POST', `/api/status/${status._id}/view`, makeToken(userB));
    expect(res2.body.viewersCount).toBe(1);

    // Now Alice blocks Charlie
    userA.privacySettings = { blockedUsers: [userC._id] };
    await userA.save();

    // Charlie cannot view Alice's status (returns 403)
    const resBlocked = await request('POST', `/api/status/${status._id}/view`, makeToken(userC));
    expect(resBlocked.status).toBe(403);
    expect(resBlocked.body.error).toMatch(/blocked/i);
  });

  test('DELETE /api/status/:id deletes status only by owner', async () => {
    const status = await Status.create({
      user: userA._id,
      mediaUrl: 'https://example.com/status1.jpg',
    });

    // userB cannot delete userA's status
    const resB = await request('DELETE', `/api/status/${status._id}`, makeToken(userB));
    expect(resB.status).toBe(403);

    // userA can delete
    const resA = await request('DELETE', `/api/status/${status._id}`, makeToken(userA));
    expect(resA.status).toBe(200);
    expect(await Status.findById(status._id)).toBeNull();
  });
});

describe('WhatsApp Group Management & Permissions', () => {
  test('POST /api/rooms/create-group creates group with participants and invite code', async () => {
    const res = await request('POST', '/api/rooms/create-group', makeToken(userA), {
      name: 'Trip to Mountains',
      participantIds: [userB._id.toString(), userC._id.toString()],
      groupDescription: 'Planning the hiking trip',
    });

    expect(res.status).toBe(201);
    expect(res.body.room.name).toBe('Trip to Mountains');
    expect(res.body.room.members.length).toBe(3);
    expect(res.body.room.inviteCode).toBeDefined();

    // Verify userA is owner
    const ownerMember = res.body.room.members.find((m: any) => m.user === userA._id.toString());
    expect(ownerMember?.role).toBe('owner');
  });

  test('PUT /api/rooms/:roomId/permissions toggles onlyAdminsCanMessage', async () => {
    const groupRes = await request('POST', '/api/rooms/create-group', makeToken(userA), {
      name: 'Announcements Only',
      participantIds: [userB._id.toString()],
    });
    const roomId = groupRes.body.room.id;

    // Toggle onlyAdminsCanMessage
    const permRes = await request('PUT', `/api/rooms/${roomId}/permissions`, makeToken(userA), {
      onlyAdminsCanMessage: true,
    });
    expect(permRes.status).toBe(200);
    expect(permRes.body.room.onlyAdminsCanMessage).toBe(true);

    // Member userB cannot send message
    const msgResB = await request('POST', `/api/rooms/${roomId}/messages`, makeToken(userB), {
      text: 'Trying to speak',
    });
    expect(msgResB.status).toBe(403);
    expect(msgResB.body.error).toMatch(/Only admins can send messages/);

    // Admin userA can send message
    const msgResA = await request('POST', `/api/rooms/${roomId}/messages`, makeToken(userA), {
      text: 'Admin announcement',
    });
    expect(msgResA.status).toBe(201);
  });

  test('Invite code preview and join flow', async () => {
    const groupRes = await request('POST', '/api/rooms/create-group', makeToken(userA), {
      name: 'Open Community',
      groupDescription: 'Welcome all members',
    });
    const inviteCode = groupRes.body.room.inviteCode;

    // Preview
    const previewRes = await request('GET', `/api/rooms/invite/${inviteCode}`, makeToken(userC));
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.name).toBe('Open Community');
    expect(previewRes.body.membersCount).toBe(1);

    // Join
    const joinRes = await request('POST', `/api/rooms/join/${inviteCode}`, makeToken(userC));
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.joined).toBe(true);
    expect(joinRes.body.room.members.length).toBe(2);
  });
});

describe('WhatsApp Disappearing Messages & Expiry Scheduling', () => {
  test('PUT /api/rooms/:roomId/disappearing-timer sets timer and sets expiresAt on messages', async () => {
    const groupRes = await request('POST', '/api/rooms/create-group', makeToken(userA), {
      name: 'Secret Chat',
    });
    const roomId = groupRes.body.room.id;

    // Set 24h timer
    const timerRes = await request('PUT', `/api/rooms/${roomId}/disappearing-timer`, makeToken(userA), {
      disappearingTimer: '24h',
    });
    expect(timerRes.status).toBe(200);
    expect(timerRes.body.disappearingTimer).toBe('24h');

    // Send message and check expiresAt
    const msgRes = await request('POST', `/api/rooms/${roomId}/messages`, makeToken(userA), {
      text: 'This message will self-destruct in 24 hours',
    });
    expect(msgRes.status).toBe(201);
    expect(msgRes.body.message.expiresAt).toBeDefined();

    const expiresTime = new Date(msgRes.body.message.expiresAt).getTime();
    const expectedApprox = Date.now() + 24 * 60 * 60 * 1000;
    expect(Math.abs(expiresTime - expectedApprox)).toBeLessThan(5000);
  });
});
