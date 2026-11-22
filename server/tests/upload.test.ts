import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';
import fs from 'fs';
import path from 'path';

process.env.JWT_SECRET = 'test-secret-for-jest';

import { setupMongo, teardownMongo } from './setup';
import { User } from '../src/features/auth/user.model';
import uploadRoutes from '../src/features/upload/upload.routes';
import { JWT_SECRET } from '../src/shared/utils/constants';

let app: express.Express;
let server: http.Server;
let port: number;
let alice: any;

function makeToken(user: any) {
  return jwt.sign({ sub: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '15m' });
}

function sendMultipart(pathName: string, token: string, parts: Array<{ name: string; filename?: string; contentType?: string; data: Buffer | string }>): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const boundary = '----JestMultipartBoundary' + Math.random().toString(36).slice(2);
    const chunks: Buffer[] = [];

    for (const part of parts) {
      chunks.push(Buffer.from(`--${boundary}\r\n`));
      if (part.filename) {
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`));
      } else {
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"\r\n`));
      }
      if (part.contentType) {
        chunks.push(Buffer.from(`Content-Type: ${part.contentType}\r\n`));
      }
      chunks.push(Buffer.from('\r\n'));
      chunks.push(Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data));
      chunks.push(Buffer.from('\r\n'));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(chunks);

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: pathName,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
          Authorization: `Bearer ${token}`,
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
    req.write(body);
    req.end();
  });
}

beforeAll(async () => {
  await setupMongo();

  app = express();
  app.use(express.json());
  app.use('/api/upload', uploadRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });

  alice = await User.create({
    username: 'upload_alice',
    email: 'upload_alice@example.com',
    passwordHash: 'hash',
  });
});

afterAll(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await teardownMongo();
});

describe('Upload API (/api/upload)', () => {
  test('POST /api/upload uploads a single image file successfully', async () => {
    const token = makeToken(alice);

    const res = await sendMultipart('/api/upload', token, [
      {
        name: 'file',
        filename: 'avatar.png',
        contentType: 'image/png',
        data: 'fake-png-content-stream',
      },
    ]);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.attachment).toBeDefined();
    expect(res.body.attachment.filename).toBe('avatar.png');
    expect(res.body.attachment.fileType).toBe('image');
    expect(res.body.attachment.mimeType).toBe('image/png');
    expect(res.body.attachment.url).toMatch(/^\/uploads\//);
  });

  test('POST /api/upload rejects disallowed mime type', async () => {
    const token = makeToken(alice);

    const res = await sendMultipart('/api/upload', token, [
      {
        name: 'file',
        filename: 'script.sh',
        contentType: 'application/x-sh',
        data: '#!/bin/sh\necho hello',
      },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid file type/);
  });

  test('POST /api/upload returns 400 when no file is uploaded', async () => {
    const token = makeToken(alice);

    const res = await sendMultipart('/api/upload', token, [
      {
        name: 'other_field',
        data: 'no file here',
      },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file uploaded');
  });

  test('POST /api/upload/multiple uploads multiple files', async () => {
    const token = makeToken(alice);

    const res = await sendMultipart('/api/upload/multiple', token, [
      {
        name: 'files',
        filename: 'doc1.pdf',
        contentType: 'application/pdf',
        data: '%PDF-1.4 mock pdf data',
      },
      {
        name: 'files',
        filename: 'notes.txt',
        contentType: 'text/plain',
        data: 'plain text notes',
      },
    ]);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.attachments)).toBe(true);
    expect(res.body.attachments.length).toBe(2);
    expect(res.body.attachments[0].fileType).toBe('document');
    expect(res.body.attachments[1].fileType).toBe('document');
  });
});
