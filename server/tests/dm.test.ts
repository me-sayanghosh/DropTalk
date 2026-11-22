import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup';
import { User } from '../src/features/auth/user.model';
import { Room } from '../src/features/rooms/room.model';
import { Message } from '../src/features/messages/message.model';
import dmRoutes from '../src/features/dm/dm.routes';
import { JWT_SECRET } from '../src/shared/utils/constants';

let app: express.Express;
let server: http.Server;
let port: number;
let alice: any;
let bob: any;

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
  app.use('/api/dm', dmRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });

  alice = await User.create({ username: 'dm_alice', email: 'alice@test.com' });
  bob = await User.create({ username: 'dm_bob', email: 'bob@test.com' });
});

afterAll(async () => {
  server?.close();
  await teardownMongo();
});

beforeEach(async () => {
  await Room.deleteMany({});
  await Message.deleteMany({});
});

describe('Direct Messages API', () => {
  test('POST /api/dm/send creates pending DM conversation and message', async () => {
    const aliceToken = makeToken(alice);
    const res = await request('POST', '/api/dm/send', aliceToken, {
      toUserId: bob._id.toString(),
      text: 'Hey Bob, how are you?',
    });

    expect(res.status).toBe(201);
    expect(res.body.room.isDM).toBe(true);
    expect(res.body.room.dmStatus).toBe('pending');
    expect(res.body.message.text).toBe('Hey Bob, how are you?');

    // Bob views conversations
    const bobToken = makeToken(bob);
    const convRes = await request('GET', '/api/dm/conversations', bobToken);
    expect(convRes.status).toBe(200);
    expect(convRes.body.conversations.length).toBe(1);
    expect(convRes.body.conversations[0].partner.username).toBe('dm_alice');
  });

  test('POST /api/dm/send succeeds with attachment only (no text provided)', async () => {
    const aliceToken = makeToken(alice);
    const res = await request('POST', '/api/dm/send', aliceToken, {
      toUserId: bob._id.toString(),
      attachments: [{ url: '/uploads/sample.pdf', filename: 'sample.pdf', fileType: 'document' }],
    });

    expect(res.status).toBe(201);
    expect(res.body.room.isDM).toBe(true);
    expect(res.body.message.attachments.length).toBe(1);
    expect(res.body.message.attachments[0].filename).toBe('sample.pdf');
  });

  test('POST /api/dm/:roomId/accept updates dmStatus to accepted', async () => {
    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    const sendRes = await request('POST', '/api/dm/send', aliceToken, {
      toUserId: bob._id.toString(),
      text: 'Let us connect!',
    });
    const roomId = sendRes.body.room.id;

    // Bob accepts the DM
    const acceptRes = await request('POST', `/api/dm/${roomId}/accept`, bobToken);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.room.dmStatus).toBe('accepted');

    const updatedRoom = await Room.findById(roomId);
    expect(updatedRoom?.dmStatus).toBe('accepted');
  });

  test('GET /api/dm/:roomId/messages supports pagination with before', async () => {
    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    const sendRes = await request('POST', '/api/dm/send', aliceToken, {
      toUserId: bob._id.toString(),
      text: 'Msg 1',
    });
    const roomId = sendRes.body.room.id;

    // Accept DM so subsequent messages are allowed
    await request('POST', `/api/dm/${roomId}/accept`, bobToken);

    await request('POST', `/api/dm/${roomId}/messages`, aliceToken, {
      text: 'Msg 2',
    });

    const msgListRes = await request('GET', `/api/dm/${roomId}/messages?limit=1`, aliceToken);
    expect(msgListRes.status).toBe(200);
    expect(msgListRes.body.messages.length).toBe(1);
    expect(msgListRes.body.messages[0].text).toBe('Msg 2');

    // Before pagination
    const beforeRes = await request(
      'GET',
      `/api/dm/${roomId}/messages?limit=1&before=${msgListRes.body.messages[0].id}`,
      aliceToken
    );
    expect(beforeRes.status).toBe(200);
    expect(beforeRes.body.messages.length).toBe(1);
    expect(beforeRes.body.messages[0].text).toBe('Msg 1');
  });

  test('DELETE /api/dm/:roomId removes conversation and messages', async () => {
    const aliceToken = makeToken(alice);
    const sendRes = await request('POST', '/api/dm/send', aliceToken, {
      toUserId: bob._id.toString(),
      text: 'To be removed',
    });
    const roomId = sendRes.body.room.id;

    const delRes = await request('DELETE', `/api/dm/${roomId}`, aliceToken);
    expect(delRes.status).toBe(200);
    expect(delRes.body.ok).toBe(true);

    const roomAfter = await Room.findById(roomId);
    expect(roomAfter).toBeNull();

    const messagesAfter = await Message.countDocuments({ room: roomId });
    expect(messagesAfter).toBe(0);
  });
});
