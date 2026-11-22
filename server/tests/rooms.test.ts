import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup';
import { User } from '../src/features/auth/user.model';
import { Room } from '../src/features/rooms/room.model';
import roomsRoutes from '../src/features/rooms/rooms.routes';
import { JWT_SECRET } from '../src/shared/utils/constants';

let app: express.Express;
let server: http.Server;
let port: number;
let ownerUser: any;
let memberUser: any;
let outsiderUser: any;

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
  app.use('/api/rooms', roomsRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });

  ownerUser = await User.create({ username: 'room_owner', email: 'owner@test.com' });
  memberUser = await User.create({ username: 'room_member', email: 'member@test.com' });
  outsiderUser = await User.create({ username: 'room_outsider', email: 'outsider@test.com' });
});

afterAll(async () => {
  server?.close();
  await teardownMongo();
});

beforeEach(async () => {
  await Room.deleteMany({});
});

describe('Rooms API', () => {
  test('POST /api/rooms creates a new channel with creator as owner', async () => {
    const token = makeToken(ownerUser);
    const res = await request('POST', '/api/rooms', token, { name: 'general', type: 'public' });

    expect(res.status).toBe(201);
    expect(res.body.room.name).toBe('general');
    expect(res.body.room.type).toBe('public');

    const created = await Room.findOne({ name: 'general' });
    expect(created).not.toBeNull();
    expect(created?.members[0].role).toBe('owner');
  });

  test('GET /api/rooms lists channels and populates memberships', async () => {
    const token = makeToken(ownerUser);
    await request('POST', '/api/rooms', token, { name: 'dev', type: 'public' });

    const res = await request('GET', '/api/rooms', token);
    expect(res.status).toBe(200);
    expect(res.body.rooms.length).toBeGreaterThanOrEqual(1);
    expect(res.body.memberships.length).toBeGreaterThanOrEqual(1);
  });

  test('Private channel join requests, grant, and deny', async () => {
    const ownerToken = makeToken(ownerUser);
    const outsiderToken = makeToken(outsiderUser);

    const createRes = await request('POST', '/api/rooms', ownerToken, { name: 'secret', type: 'private' });
    const roomId = createRes.body.room.id;

    // Outsider requests to join
    const reqRes = await request('POST', `/api/rooms/${roomId}/request-join`, outsiderToken);
    expect(reqRes.status).toBe(200);

    // Owner checks pending requests
    const pendingRes = await request('GET', `/api/rooms/${roomId}/pending-requests`, ownerToken);
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.requests.length).toBe(1);

    // Owner grants request
    const grantRes = await request('POST', `/api/rooms/${roomId}/pending-requests/${outsiderUser._id}/grant`, ownerToken);
    expect(grantRes.status).toBe(200);

    const roomAfterGrant = await Room.findById(roomId);
    expect(roomAfterGrant?.members.some((m) => m.user.toString() === outsiderUser._id.toString())).toBe(true);
  });

  test('POST /api/rooms/:roomId/leave allows a member to leave', async () => {
    const ownerToken = makeToken(ownerUser);
    const memberToken = makeToken(memberUser);

    const room = await Room.create({
      name: 'leavable',
      createdBy: ownerUser._id,
      type: 'public',
      members: [
        { user: ownerUser._id, role: 'owner', joinedAt: new Date(), muted: false },
        { user: memberUser._id, role: 'member', joinedAt: new Date(), muted: false },
      ],
      encryptedKeys: [
        { user: memberUser._id, key: 'secret_key_member' },
      ],
    });

    const res = await request('POST', `/api/rooms/${room._id}/leave`, memberToken);
    expect(res.status).toBe(200);

    const updated = await Room.findById(room._id);
    expect(updated?.members.some((m) => m.user.toString() === memberUser._id.toString())).toBe(false);
    expect(updated?.encryptedKeys.some((ek) => ek.user.toString() === memberUser._id.toString())).toBe(false);
  });

  test('DELETE /api/rooms/:roomId allows only owner to delete channel', async () => {
    const ownerToken = makeToken(ownerUser);
    const memberToken = makeToken(memberUser);

    const room = await Room.create({
      name: 'deletable',
      createdBy: ownerUser._id,
      type: 'public',
      members: [
        { user: ownerUser._id, role: 'owner', joinedAt: new Date(), muted: false },
        { user: memberUser._id, role: 'member', joinedAt: new Date(), muted: false },
      ],
    });

    // Non-owner should fail with 403
    const forbiddenRes = await request('DELETE', `/api/rooms/${room._id}`, memberToken);
    expect(forbiddenRes.status).toBe(403);

    // Owner should succeed
    const okRes = await request('DELETE', `/api/rooms/${room._id}`, ownerToken);
    expect(okRes.status).toBe(200);

    const afterDel = await Room.findById(room._id);
    expect(afterDel).toBeNull();
  });
});
