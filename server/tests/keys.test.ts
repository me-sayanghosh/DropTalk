import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup';
import { User } from '../src/features/auth/user.model';
import { Room } from '../src/features/rooms/room.model';
import keyRoutes from '../src/features/keys/keys.routes';
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
  app.use('/api/rooms', keyRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });

  alice = await User.create({
    username: 'key_alice',
    email: 'key_alice@example.com',
    passwordHash: 'hash',
  });

  bob = await User.create({
    username: 'key_bob',
    email: 'key_bob@example.com',
    passwordHash: 'hash',
  });

  charlie = await User.create({
    username: 'key_charlie',
    email: 'key_charlie@example.com',
    passwordHash: 'hash',
  });
});

afterAll(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await teardownMongo();
});

beforeEach(async () => {
  await Room.deleteMany({});
});

describe('Keys API (/api/rooms/:roomId/keys)', () => {
  test('POST /api/rooms/:roomId/keys validates payload and membership', async () => {
    const room = await Room.create({
      name: 'Key Room',
      isDirectMessage: false,
      createdBy: alice._id,
      members: [{ user: alice._id, role: 'owner' }],
    });

    const aliceToken = makeToken(alice);
    const charlieToken = makeToken(charlie);

    // Missing encryptedKey
    const badReq = await request('POST', `/api/rooms/${room._id}/keys`, aliceToken, {});
    expect(badReq.status).toBe(400);

    // Non-member access
    const nonMember = await request('POST', `/api/rooms/${room._id}/keys`, charlieToken, {
      encryptedKey: 'secret_key_123',
    });
    expect(nonMember.status).toBe(403);
  });

  test('POST and GET /api/rooms/:roomId/keys for self', async () => {
    const room = await Room.create({
      name: 'Key Room 2',
      isDirectMessage: false,
      createdBy: alice._id,
      members: [{ user: alice._id, role: 'owner' }],
    });

    const aliceToken = makeToken(alice);

    // Save key
    const saveRes = await request('POST', `/api/rooms/${room._id}/keys`, aliceToken, {
      encryptedKey: 'my_encrypted_key_v1',
    });
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.ok).toBe(true);

    // Fetch key
    const getRes = await request('GET', `/api/rooms/${room._id}/keys`, aliceToken);
    expect(getRes.status).toBe(200);
    expect(getRes.body.encryptedKeys.length).toBe(1);
    expect(getRes.body.encryptedKeys[0].key).toBe('my_encrypted_key_v1');

    // Overwrite key
    const updateRes = await request('POST', `/api/rooms/${room._id}/keys`, aliceToken, {
      encryptedKey: 'my_encrypted_key_v2',
    });
    expect(updateRes.status).toBe(200);

    const getRes2 = await request('GET', `/api/rooms/${room._id}/keys`, aliceToken);
    expect(getRes2.body.encryptedKeys.length).toBe(1);
    expect(getRes2.body.encryptedKeys[0].key).toBe('my_encrypted_key_v2');
  });

  test('POST with targetUserId allows owner/mod and rejects standard member', async () => {
    const room = await Room.create({
      name: 'Key Room 3',
      isDirectMessage: false,
      createdBy: alice._id,
      members: [
        { user: alice._id, role: 'owner' },
        { user: bob._id, role: 'member' },
        { user: charlie._id, role: 'member' },
      ],
    });

    const aliceToken = makeToken(alice);
    const bobToken = makeToken(bob);

    // Alice (owner) sets key for Bob
    const ownerSet = await request('POST', `/api/rooms/${room._id}/keys`, aliceToken, {
      encryptedKey: 'key_for_bob',
      targetUserId: bob._id.toString(),
    });
    expect(ownerSet.status).toBe(200);

    // Bob (member) cannot set key for Charlie
    const memberSet = await request('POST', `/api/rooms/${room._id}/keys`, bobToken, {
      encryptedKey: 'key_for_charlie',
      targetUserId: charlie._id.toString(),
    });
    expect(memberSet.status).toBe(403);

    // Bob can read the key Alice stored for Bob
    const bobGet = await request('GET', `/api/rooms/${room._id}/keys`, bobToken);
    expect(bobGet.status).toBe(200);
    expect(bobGet.body.encryptedKeys.length).toBe(1);
    expect(bobGet.body.encryptedKeys[0].key).toBe('key_for_bob');

    // GET /all returns all keys
    const allRes = await request('GET', `/api/rooms/${room._id}/keys/all`, bobToken);
    expect(allRes.status).toBe(200);
    expect(allRes.body.keys.length).toBe(1);
    expect(allRes.body.keys[0].user).toBe(bob._id.toString());
  });
});
