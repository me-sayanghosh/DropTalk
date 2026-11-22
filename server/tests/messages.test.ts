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
let senderUser: any;
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

  senderUser = await User.create({ username: 'msg_sender', email: 'sender@test.com' });
});

afterAll(async () => {
  server?.close();
  await teardownMongo();
});

beforeEach(async () => {
  await Message.deleteMany({});
  await Room.deleteMany({});
  room = await Room.create({
    name: 'test-chat',
    createdBy: senderUser._id,
    type: 'public',
    members: [{ user: senderUser._id, role: 'owner', joinedAt: new Date(), muted: false }],
  });
});

describe('Messages API', () => {
  test('POST /api/rooms/:roomId/messages creates message with sender and clientMsgId', async () => {
    const token = makeToken(senderUser);
    const clientMsgId = `client-${Date.now()}`;
    const res = await request('POST', `/api/rooms/${room._id}/messages`, token, {
      text: 'Hello world!',
      clientMsgId,
    });

    expect(res.status).toBe(201);
    expect(res.body.message.text).toBe('Hello world!');
    expect(res.body.message.clientMsgId).toBe(clientMsgId);

    // Duplicate clientMsgId returns existing message without duplicate insert
    const dupRes = await request('POST', `/api/rooms/${room._id}/messages`, token, {
      text: 'Hello world again!',
      clientMsgId,
    });
    expect(dupRes.status).toBe(200);
    expect(dupRes.body.message.id).toBe(res.body.message.id);

    const count = await Message.countDocuments({ room: room._id });
    expect(count).toBe(1);
  });

  test('GET /api/rooms/:roomId/messages supports pagination via before parameter', async () => {
    const token = makeToken(senderUser);
    const msg1 = await Message.create({ room: room._id, sender: senderUser._id, text: 'First msg' });
    const msg2 = await Message.create({ room: room._id, sender: senderUser._id, text: 'Second msg' });

    const res = await request('GET', `/api/rooms/${room._id}/messages?limit=1&before=${msg2._id}`, token);
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(1);
    expect(res.body.messages[0].text).toBe('First msg');
  });

  test('GET /api/rooms/:roomId/messages/search searches message text', async () => {
    const token = makeToken(senderUser);
    await Message.create({ room: room._id, sender: senderUser._id, text: 'Deploy the production server' });
    await Message.create({ room: room._id, sender: senderUser._id, text: 'Lunch break soon' });

    const res = await request('GET', `/api/rooms/${room._id}/messages/search?q=production`, token);
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(1);
    expect(res.body.messages[0].text).toContain('production server');
  });

  test('PUT /api/rooms/:roomId/messages/:messageId edits message', async () => {
    const token = makeToken(senderUser);
    const msg = await Message.create({ room: room._id, sender: senderUser._id, text: 'Original text' });

    const res = await request('PUT', `/api/rooms/${room._id}/messages/${msg._id}`, token, {
      text: 'Edited text',
    });
    expect(res.status).toBe(200);
    expect(res.body.message.text).toBe('Edited text');
    expect(res.body.message.edited).toBe(true);
  });

  test('POST /api/rooms/:roomId/messages/:messageId/delete-for-me hides message for user', async () => {
    const token = makeToken(senderUser);
    const msg = await Message.create({ room: room._id, sender: senderUser._id, text: 'Secret to hide' });

    const delRes = await request('POST', `/api/rooms/${room._id}/messages/${msg._id}/delete-for-me`, token);
    expect(delRes.status).toBe(200);

    const getRes = await request('GET', `/api/rooms/${room._id}/messages`, token);
    expect(getRes.body.messages.find((m: any) => m.id === msg._id.toString())).toBeUndefined();
  });
});
