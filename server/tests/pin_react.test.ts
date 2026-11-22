import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup';
import { User } from '../src/features/auth/user.model';
import { Room } from '../src/features/rooms/room.model';
import { Message } from '../src/features/messages/message.model';
import messagesRoutes from '../src/features/messages/messages.routes';
import { JWT_SECRET } from '../src/shared/utils/constants';

let app: express.Express;
let server: http.Server;
let port: number;
let user1: any;
let user2: any;
let room: any;

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
  app.use('/api/rooms', messagesRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });

  user1 = await User.create({ username: 'react_user1', email: 'u1@test.com' });
  user2 = await User.create({ username: 'react_user2', email: 'u2@test.com' });
});

afterAll(async () => {
  server?.close();
  await teardownMongo();
});

beforeEach(async () => {
  await Message.deleteMany({});
  await Room.deleteMany({});
  room = await Room.create({
    name: 'react-room',
    createdBy: user1._id,
    type: 'public',
    members: [
      { user: user1._id, role: 'owner', joinedAt: new Date(), muted: false },
      { user: user2._id, role: 'member', joinedAt: new Date(), muted: false },
    ],
  });
});

describe('Pinned Messages and Reactions API', () => {
  test('Pin and unpin message endpoints', async () => {
    const token = makeToken(user1);
    const msg = await Message.create({ room: room._id, sender: user1._id, text: 'Important announcement!' });

    // Pin message
    const pinRes = await request('POST', `/api/rooms/${room._id}/messages/${msg._id}/pin`, token);
    expect(pinRes.status).toBe(200);
    expect(pinRes.body.ok).toBe(true);

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.pinnedMessages.map((id) => id.toString())).toContain(msg._id.toString());

    // GET /api/rooms/:roomId/pinned returns the pinned message
    const getPinnedRes = await request('GET', `/api/rooms/${room._id}/pinned`, token);
    expect(getPinnedRes.status).toBe(200);
    expect(getPinnedRes.body.messages.length).toBe(1);
    expect(getPinnedRes.body.messages[0].text).toBe('Important announcement!');

    // Unpin message
    const unpinRes = await request('POST', `/api/rooms/${room._id}/messages/${msg._id}/unpin`, token);
    expect(unpinRes.status).toBe(200);

    const roomAfterUnpin = await Room.findById(room._id);
    expect(roomAfterUnpin?.pinnedMessages.length).toBe(0);
  });

  test('POST /api/rooms/:roomId/messages/:messageId/react toggles reaction', async () => {
    const token1 = makeToken(user1);
    const token2 = makeToken(user2);
    const msg = await Message.create({ room: room._id, sender: user1._id, text: 'React to me' });

    // User 1 adds 👍
    const r1 = await request('POST', `/api/rooms/${room._id}/messages/${msg._id}/react`, token1, { emoji: '👍' });
    expect(r1.status).toBe(200);
    expect(r1.body.reactions.find((r: any) => r.emoji === '👍')?.users.length).toBe(1);

    // User 2 adds 👍
    const r2 = await request('POST', `/api/rooms/${room._id}/messages/${msg._id}/react`, token2, { emoji: '👍' });
    expect(r2.status).toBe(200);
    expect(r2.body.reactions.find((r: any) => r.emoji === '👍')?.users.length).toBe(2);

    // User 1 removes 👍 (toggle)
    const r3 = await request('POST', `/api/rooms/${room._id}/messages/${msg._id}/react`, token1, { emoji: '👍' });
    expect(r3.status).toBe(200);
    expect(r3.body.reactions.find((r: any) => r.emoji === '👍')?.users.length).toBe(1);
  });

  test('Concurrent reactions on the same message by multiple users in parallel', async () => {
    const token1 = makeToken(user1);
    const token2 = makeToken(user2);
    const msg = await Message.create({ room: room._id, sender: user1._id, text: 'Concurrent reactions test' });

    // Both users react in parallel at the exact same time
    const [res1, res2] = await Promise.all([
      request('POST', `/api/rooms/${room._id}/messages/${msg._id}/react`, token1, { emoji: '🔥' }),
      request('POST', `/api/rooms/${room._id}/messages/${msg._id}/react`, token2, { emoji: '🔥' }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const updated = await Message.findById(msg._id);
    const fireReaction = updated?.reactions.find((r) => r.emoji === '🔥');
    expect(fireReaction).toBeDefined();
    expect(fireReaction?.users.length).toBe(2);
  });
});
