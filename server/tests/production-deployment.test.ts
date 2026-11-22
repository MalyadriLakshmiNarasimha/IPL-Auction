import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server, startServer } from '../index';
import { io as ioClient } from 'socket.io-client';
import { db, prisma } from '../../src/lib/db';
import { hashPassword, createSession, AUTH_COOKIE_NAME } from '../../src/lib/auth';
import { isAllowedOrigin, getAllowedOrigins } from '../cors';
import http from 'http';

const TEST_PORT = 3006;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

describe('Production Deployment & CORS Verification Suite', () => {
  let validSessionToken: string;
  let testUserId: string;

  beforeAll(async () => {
    await startServer(TEST_PORT);

    // Clean up test user
    try {
      await prisma.user.deleteMany({
        where: { email: 'prod_test@iplauction.live' },
      });
    } catch (e) {}

    const password_hash = await hashPassword('ProductionSecurePassword123!');
    const user = await db.user.create({
      data: {
        name: 'Production Admin',
        email: 'prod_test@iplauction.live',
        password_hash,
      },
    });
    testUserId = user.id;

    const session = await createSession(user.id);
    validSessionToken = session.sessionToken;
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: 'prod_test@iplauction.live' },
      });
    } catch (e) {}
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // 1. CORS Policy Validation
  describe('1. Centralized CORS Policy', () => {
    it('recognizes all production and local allowed origins', () => {
      const allowed = getAllowedOrigins();
      expect(allowed).toContain('https://ipl-auction-live-game.vercel.app');
      expect(allowed).toContain('https://ipl-auction-backend-495n.onrender.com');
      expect(allowed).toContain('https://iplauctionlive.netlify.app');
      expect(allowed).toContain('http://localhost:3000');
      expect(allowed).toContain('http://localhost:3001');

      expect(isAllowedOrigin('https://ipl-auction-live-game.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://ipl-auction-backend-495n.onrender.com')).toBe(true);
      expect(isAllowedOrigin('https://iplauctionlive.netlify.app')).toBe(true);
      expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
      expect(isAllowedOrigin('http://localhost:3001')).toBe(true);
      expect(isAllowedOrigin('https://attacker-domain.evil.com')).toBe(false);
      expect(isAllowedOrigin('*')).toBe(false);
    });

    it('returns exact Access-Control-Allow-Origin and credentials for Vercel production origin', async () => {
      const res = await new Promise<{ headers: http.IncomingHttpHeaders; status: number }>((resolve) => {
        const req = http.request(
          `${SERVER_URL}/health`,
          {
            method: 'GET',
            headers: {
              Origin: 'https://ipl-auction-live-game.vercel.app',
            },
          },
          (res) => {
            resolve({ headers: res.headers, status: res.statusCode || 500 });
          }
        );
        req.end();
      });

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://ipl-auction-live-game.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('succeeds for preflight OPTIONS from Vercel with allowed methods and headers', async () => {
      const res = await new Promise<{ headers: http.IncomingHttpHeaders; status: number }>((resolve) => {
        const req = http.request(
          `${SERVER_URL}/api/rooms`,
          {
            method: 'OPTIONS',
            headers: {
              Origin: 'https://ipl-auction-live-game.vercel.app',
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'Content-Type, Authorization',
            },
          },
          (res) => {
            resolve({ headers: res.headers, status: res.statusCode || 500 });
          }
        );
        req.end();
      });

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('https://ipl-auction-live-game.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
      expect(res.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('rejects preflight OPTIONS from unallowed origins with 403', async () => {
      const res = await new Promise<{ status: number }>((resolve) => {
        const req = http.request(
          `${SERVER_URL}/api/rooms`,
          {
            method: 'OPTIONS',
            headers: {
              Origin: 'https://malicious-phishing.com',
            },
          },
          (res) => {
            resolve({ status: res.statusCode || 500 });
          }
        );
        req.end();
      });

      expect(res.status).toBe(403);
    });
  });

  // 2. Authentication Flow & Session Cookies
  describe('2. Authentication Flow & HTTP-Only Session Cookies', () => {
    it('creates room using session token passed via Cookie header', async () => {
      const postData = JSON.stringify({ room_name: 'Production Cookie Room' });

      const res = await new Promise<{ status: number; body: any }>((resolve) => {
        const req = http.request(
          `${SERVER_URL}/api/rooms`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              Origin: 'https://iplauctionlive.netlify.app',
              Cookie: `${AUTH_COOKIE_NAME}=${validSessionToken}`,
            },
          },
          (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
              resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
            });
          }
        );
        req.write(postData);
        req.end();
      });

      expect(res.status).toBe(201);
      expect(res.body.room_code).toBeDefined();
      expect(res.body.room_code).toHaveLength(6);
    });

    it('authenticates user on /api/auth/me via Cookie header', async () => {
      const res = await new Promise<{ status: number; body: any }>((resolve) => {
        const req = http.request(
          `${SERVER_URL}/api/auth/me`,
          {
            method: 'GET',
            headers: {
              Origin: 'https://iplauctionlive.netlify.app',
              Cookie: `${AUTH_COOKIE_NAME}=${validSessionToken}`,
            },
          },
          (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
              resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
            });
          }
        );
        req.end();
      });

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.user.email).toBe('prod_test@iplauction.live');
      // Must NOT leak session token in body!
      expect(res.body.sessionToken).toBeUndefined();
    });

    it('logs out and sets expired cookie header', async () => {
      const res = await new Promise<{ headers: http.IncomingHttpHeaders; body: any }>((resolve) => {
        const req = http.request(
          `${SERVER_URL}/api/auth/logout`,
          {
            method: 'POST',
            headers: {
              Origin: 'https://iplauctionlive.netlify.app',
              Cookie: `${AUTH_COOKIE_NAME}=${validSessionToken}`,
            },
          },
          (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
              resolve({ headers: res.headers, body: JSON.parse(data) });
            });
          }
        );
        req.end();
      });

      expect(res.body.success).toBe(true);
      const setCookie = res.headers['set-cookie']?.[0] || '';
      expect(setCookie).toContain(`${AUTH_COOKIE_NAME}=`);
      expect(setCookie).toMatch(/Max-Age=0/i);
    });
  });

  // 3. Socket.IO Cross-Origin with Credentials
  describe('3. Socket.IO Cross-Origin Connection', () => {
    it('accepts Socket.IO connection with credentials and Netlify origin', async () => {
      // Re-create session for test user
      const session = await createSession(testUserId);

      const socket = ioClient(SERVER_URL, {
        transports: ['polling'],
        forceNew: true,
        extraHeaders: {
          Origin: 'https://iplauctionlive.netlify.app',
          Cookie: `${AUTH_COOKIE_NAME}=${session.sessionToken}`,
        },
        withCredentials: true,
      });

      const connected = await new Promise<boolean>((resolve) => {
        socket.on('connect', () => {
          socket.disconnect();
          resolve(true);
        });
        socket.on('connect_error', (err) => {
          console.error('[TEST SOCKET CONNECT ERROR]:', err.message);
          resolve(false);
        });
      });

      expect(connected).toBe(true);
    });

    it('accepts Socket.IO connection with handshake auth token and Vercel origin', async () => {
      const session = await createSession(testUserId);

      const socket = ioClient(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true,
        auth: {
          token: session.sessionToken,
        },
        extraHeaders: {
          Origin: 'https://ipl-auction-live-game.vercel.app',
        },
      });

      const connected = await new Promise<boolean>((resolve) => {
        socket.on('connect', () => {
          socket.disconnect();
          resolve(true);
        });
        socket.on('connect_error', (err) => {
          console.error('[TEST VERCEL SOCKET ERROR]:', err.message);
          resolve(false);
        });
      });

      expect(connected).toBe(true);
    });
  });
});
