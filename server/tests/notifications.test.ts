import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup';
import { User } from '../src/features/auth/user.model';
import { Notification } from '../src/features/notifications/notification.model';
import notificationsRoutes from '../src/features/notifications/notifications.routes';
import { createNotification } from '../src/features/notifications/notifications.service';
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
  app.use('/api/notifications', notificationsRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });

  alice = await User.create({
    username: 'notif_alice',
    email: 'notif_alice@example.com',
    passwordHash: 'hash',
  });

  bob = await User.create({
    username: 'notif_bob',
    email: 'notif_bob@example.com',
    passwordHash: 'hash',
  });
});

afterAll(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await teardownMongo();
});

beforeEach(async () => {
  await Notification.deleteMany({});
  await User.findByIdAndUpdate(alice._id, {
    'notificationSettings.groupNotifications': true,
    'notificationSettings.directNotifications': true,
  });
});

describe('Notifications API and Service (/api/notifications)', () => {
  test('createNotification service respects self-notification and preferences', async () => {
    // Self notification should return null
    const selfNotif = await createNotification({
      userId: alice._id,
      actorId: alice._id,
      type: 'mention',
      title: 'Self ping',
    });
    expect(selfNotif).toBeNull();

    // Disable direct notifications on Alice
    await User.findByIdAndUpdate(alice._id, { 'notificationSettings.directNotifications': false });
    const dmNotif = await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'dm',
      title: 'New message',
    });
    expect(dmNotif).toBeNull();

    // Mention notification should still work
    const mentionNotif = await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'mention',
      title: 'Tagged you',
    });
    expect(mentionNotif).not.toBeNull();
    expect(mentionNotif.title).toBe('Tagged you');
  });

  test('GET /api/notifications returns user notifications and unreadCount', async () => {
    const token = makeToken(alice);

    await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'mention',
      title: 'Note 1',
    });
    await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'mention',
      title: 'Note 2',
    });

    const res = await request('GET', '/api/notifications', token);
    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBe(2);
    expect(res.body.unreadCount).toBe(2);
  });

  test('PUT /api/notifications/:id/read and PUT /api/notifications/read-all mark read', async () => {
    const token = makeToken(alice);

    const n1 = await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'mention',
      title: 'Note 1',
    });
    const n2 = await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'mention',
      title: 'Note 2',
    });

    // Mark single
    const read1 = await request('PUT', `/api/notifications/${n1.id}/read`, token);
    expect(read1.status).toBe(200);
    expect(read1.body.ok).toBe(true);
    expect(read1.body.notification.read).toBe(true);

    const list1 = await request('GET', '/api/notifications', token);
    expect(list1.body.unreadCount).toBe(1);

    // Mark all
    const readAll = await request('PUT', '/api/notifications/read-all', token);
    expect(readAll.status).toBe(200);
    expect(readAll.body.ok).toBe(true);

    const list2 = await request('GET', '/api/notifications', token);
    expect(list2.body.unreadCount).toBe(0);
  });

  test('DELETE /api/notifications/room/:roomId removes room notifications', async () => {
    const token = makeToken(alice);

    await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'mention',
      title: 'Room Note',
      roomId: 'room123',
    });
    await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'system',
      title: 'Global Note',
    });

    const delRoom = await request('DELETE', '/api/notifications/room/room123', token);
    expect(delRoom.status).toBe(200);

    const list = await request('GET', '/api/notifications', token);
    expect(list.body.notifications.length).toBe(1);
    expect(list.body.notifications[0].title).toBe('Global Note');
  });

  test('DELETE /api/notifications/clear-all removes all notifications for user', async () => {
    const token = makeToken(alice);

    await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'mention',
      title: 'Note 1',
    });
    await createNotification({
      userId: alice._id,
      actorId: bob._id,
      type: 'mention',
      title: 'Note 2',
    });

    const clearRes = await request('DELETE', '/api/notifications/clear-all', token);
    expect(clearRes.status).toBe(200);

    const list = await request('GET', '/api/notifications', token);
    expect(list.body.notifications.length).toBe(0);
  });

  test('PUT /api/notifications/settings updates notification preferences', async () => {
    const token = makeToken(alice);

    const res = await request('PUT', '/api/notifications/settings', token, {
      groupNotifications: false,
      directNotifications: false,
      backgroundSync: false,
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.notificationSettings.groupNotifications).toBe(false);
    expect(res.body.user.notificationSettings.directNotifications).toBe(false);
  });
});
