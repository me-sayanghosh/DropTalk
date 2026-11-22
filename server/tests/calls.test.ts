import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup';
import { User } from '../src/features/auth/user.model';
import { CallLog } from '../src/features/calls/callLog.model';
import callsRoutes from '../src/features/calls/calls.routes';
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
  app.use('/api/calls', callsRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });

  alice = await User.create({
    username: 'call_alice',
    email: 'call_alice@example.com',
    passwordHash: 'hash',
  });

  bob = await User.create({
    username: 'call_bob',
    email: 'call_bob@example.com',
    passwordHash: 'hash',
  });
});

afterAll(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await teardownMongo();
});

beforeEach(async () => {
  await CallLog.deleteMany({});
});

describe('Calls API (/api/calls)', () => {
  test('POST /api/calls/log rejects invalid type or status', async () => {
    const token = makeToken(alice);

    const badType = await request('POST', '/api/calls/log', token, {
      receiverId: bob._id.toString(),
      type: 'hologram',
    });
    expect(badType.status).toBe(400);

    const badStatus = await request('POST', '/api/calls/log', token, {
      receiverId: bob._id.toString(),
      type: 'voice',
      status: 'exploding',
    });
    expect(badStatus.status).toBe(400);

    const badDuration = await request('POST', '/api/calls/log', token, {
      receiverId: bob._id.toString(),
      durationSeconds: -5,
    });
    expect(badDuration.status).toBe(400);
  });

  test('POST /api/calls/log creates a call log and GET /api/calls/history returns it', async () => {
    const token = makeToken(alice);

    const res = await request('POST', '/api/calls/log', token, {
      receiverId: bob._id.toString(),
      type: 'voice',
      status: 'completed',
      durationSeconds: 42,
    });

    expect(res.status).toBe(201);
    expect(res.body.log).toBeDefined();
    expect(res.body.log.type).toBe('voice');
    expect(res.body.log.status).toBe('completed');
    expect(res.body.log.durationSeconds).toBe(42);

    const histRes = await request('GET', '/api/calls/history', token);
    expect(histRes.status).toBe(200);
    expect(histRes.body.logs.length).toBe(1);
    expect(histRes.body.logs[0].id).toBe(res.body.log.id);

    // Receiver should also see it
    const bobToken = makeToken(bob);
    const bobHist = await request('GET', '/api/calls/history', bobToken);
    expect(bobHist.status).toBe(200);
    expect(bobHist.body.logs.length).toBe(1);
  });

  test('PUT /api/calls/log/:logId updates duration and status', async () => {
    const token = makeToken(alice);

    const createRes = await request('POST', '/api/calls/log', token, {
      receiverId: bob._id.toString(),
      type: 'video',
      status: 'completed',
      durationSeconds: 10,
    });
    const logId = createRes.body.log.id;

    const updateRes = await request('PUT', `/api/calls/log/${logId}`, token, {
      durationSeconds: 95,
      status: 'completed',
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.log.durationSeconds).toBe(95);
  });

  test('DELETE /api/calls/history/:logId soft-deletes a single call log for user', async () => {
    const token = makeToken(alice);
    const bobToken = makeToken(bob);

    const createRes = await request('POST', '/api/calls/log', token, {
      receiverId: bob._id.toString(),
      type: 'voice',
      status: 'completed',
      durationSeconds: 30,
    });
    const logId = createRes.body.log.id;

    const delRes = await request('DELETE', `/api/calls/history/${logId}`, token);
    expect(delRes.status).toBe(200);
    expect(delRes.body.ok).toBe(true);

    // Alice should no longer see it in history
    const aliceHist = await request('GET', '/api/calls/history', token);
    expect(aliceHist.body.logs.length).toBe(0);

    // Bob should still see it
    const bobHist = await request('GET', '/api/calls/history', bobToken);
    expect(bobHist.body.logs.length).toBe(1);
  });

  test('DELETE /api/calls/history clears all call history for user', async () => {
    const token = makeToken(alice);
    const bobToken = makeToken(bob);

    await request('POST', '/api/calls/log', token, {
      receiverId: bob._id.toString(),
      type: 'voice',
      durationSeconds: 10,
    });
    await request('POST', '/api/calls/log', token, {
      receiverId: bob._id.toString(),
      type: 'video',
      durationSeconds: 20,
    });

    const clearRes = await request('DELETE', '/api/calls/history', token);
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.ok).toBe(true);

    const aliceHist = await request('GET', '/api/calls/history', token);
    expect(aliceHist.body.logs.length).toBe(0);

    const bobHist = await request('GET', '/api/calls/history', bobToken);
    expect(bobHist.body.logs.length).toBe(2);
  });
});
