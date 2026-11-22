import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup';
import { User } from '../src/features/auth/user.model';
import { Room } from '../src/features/rooms/room.model';
import { Message } from '../src/features/messages/message.model';
import aiRoutes from '../src/features/ai/ai.routes';
import { JWT_SECRET } from '../src/shared/utils/constants';

let app: express.Express;
let server: http.Server;
let port: number;
let alice: any;
let bob: any;
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
  app.use('/api/rooms', aiRoutes);
  app.use('/api/ai', aiRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });

  alice = await User.create({ username: 'ai_alice', email: 'alice@ai.com' });
  bob = await User.create({ username: 'ai_bob', email: 'bob@ai.com' });
});

afterAll(async () => {
  server?.close();
  await teardownMongo();
});

beforeEach(async () => {
  await Room.deleteMany({});
  await Message.deleteMany({});
  room = await Room.create({
    name: 'ai-room',
    createdBy: alice._id,
    type: 'public',
    members: [
      { user: alice._id, role: 'owner', joinedAt: new Date(), muted: false },
      { user: bob._id, role: 'member', joinedAt: new Date(), muted: false },
    ],
  });
});

describe('AI Copilot Routes (/api/ai and /api/rooms)', () => {
  test('POST /api/ai/:roomId/summarize generates summary for empty room', async () => {
    const token = makeToken(alice);
    const res = await request('POST', `/api/ai/${room._id}/summarize`, token);
    expect(res.status).toBe(200);
    expect(res.body.summary).toBe('No messages to summarize yet.');
  });

  test('POST /api/ai/:roomId/summarize generates conversation summary fallback', async () => {
    const token = makeToken(alice);
    await Message.create({ room: room._id, sender: alice._id, text: 'Let us deploy to production.' });
    await Message.create({ room: room._id, sender: bob._id, text: 'All tests are green, ready.' });

    const res = await request('POST', `/api/ai/${room._id}/summarize`, token);
    expect(res.status).toBe(200);
    expect(res.body.summary).toContain('Summary of recent conversation');
    expect(res.body.summary).toContain('ai_alice');
  });

  test('POST /api/ai/:roomId/suggest provides smart reply suggestions', async () => {
    const token = makeToken(alice);
    const res = await request('POST', `/api/ai/${room._id}/suggest`, token, {
      message: 'Can you review the PR?',
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.suggestions.length).toBeGreaterThan(0);
  });

  test('Routes accessible via /api/rooms/:roomId/summarize parity', async () => {
    const token = makeToken(alice);
    const res = await request('POST', `/api/rooms/${room._id}/summarize`, token);
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
  });
});
