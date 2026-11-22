import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup';
import { User } from '../src/features/auth/user.model';
import { Room } from '../src/features/rooms/room.model';
import { Message } from '../src/features/messages/message.model';
import threadsRoutes from '../src/features/messages/threads.routes';
import { JWT_SECRET } from '../src/shared/utils/constants';

let app: express.Express;
let server: http.Server;
let port: number;
let author: any;
let replier: any;
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
  app.use('/api/rooms', threadsRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });

  author = await User.create({ username: 'thread_author', email: 'author@test.com' });
  replier = await User.create({ username: 'thread_replier', email: 'replier@test.com' });
});

afterAll(async () => {
  server?.close();
  await teardownMongo();
});

beforeEach(async () => {
  await Message.deleteMany({});
  await Room.deleteMany({});
  room = await Room.create({
    name: 'thread-room',
    createdBy: author._id,
    type: 'public',
    members: [
      { user: author._id, role: 'owner', joinedAt: new Date(), muted: false },
      { user: replier._id, role: 'member', joinedAt: new Date(), muted: false },
    ],
  });
});

describe('Threads API', () => {
  test('GET /api/rooms/:roomId/messages/:messageId/replies returns replies to message', async () => {
    const token = makeToken(author);
    const parentMsg = await Message.create({ room: room._id, sender: author._id, text: 'Parent question' });
    const replyMsg = await Message.create({
      room: room._id,
      sender: replier._id,
      text: 'First reply',
      parentMessage: parentMsg._id,
    });

    const res = await request('GET', `/api/rooms/${room._id}/messages/${parentMsg._id}/replies`, token);
    expect(res.status).toBe(200);
    expect(res.body.replies.length).toBe(1);
    expect(res.body.replies[0].text).toBe('First reply');
    expect(res.body.replies[0].senderUsername).toBe('thread_replier');
  });

  test('GET /api/rooms/:roomId/threads aggregates thread reply counts', async () => {
    const token = makeToken(author);
    const parentMsg1 = await Message.create({ room: room._id, sender: author._id, text: 'Parent 1' });
    const parentMsg2 = await Message.create({ room: room._id, sender: author._id, text: 'Parent 2' });

    // 2 replies to parentMsg1, 0 to parentMsg2
    await Message.create({ room: room._id, sender: replier._id, text: 'Reply 1.1', parentMessage: parentMsg1._id });
    await Message.create({ room: room._id, sender: author._id, text: 'Reply 1.2', parentMessage: parentMsg1._id });

    const res = await request('GET', `/api/rooms/${room._id}/threads`, token);
    expect(res.status).toBe(200);
    expect(res.body.threads.length).toBeGreaterThanOrEqual(1);

    const thread1 = res.body.threads.find((t: any) => t.id === parentMsg1._id.toString());
    expect(thread1).toBeDefined();
    expect(thread1.replyCount).toBe(2);
  });
});
