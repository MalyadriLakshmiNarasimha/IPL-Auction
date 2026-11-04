import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server, startServer } from '../index';
import { io as ioClient, Socket } from 'socket.io-client';
import { db } from '../../src/lib/db';
import { hashPassword, createSession } from '../../src/lib/auth';
import http from 'http';

const TEST_PORT = 3002;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

describe('Protected Routes & Socket.IO Authentication Verification', () => {
  let validSessionToken: string;
  let testUserId: string;

  beforeAll(async () => {
    await startServer(TEST_PORT);

    // Create a real registered test user
    const password_hash = await hashPassword('ProtectedPass123!');
    const user = await db.user.create({
      data: {
        name: 'Rishabh Pant',
        email: 'pant@delhicapitals.com',
        password_hash,
      },
    });
    testUserId = user.id;

    const session = await createSession(user.id);
    validSessionToken = session.sessionToken;
  });

  afterAll(done => {
    server.close(done);
  });

  it('1. Rejects unauthenticated Socket.IO connection without token', async () => {
    const socket = ioClient(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: {}, // No token provided!
    });

    const errorPromise = new Promise<string>((resolve) => {
      socket.on('connect_error', (err) => {
        resolve(err.message);
        socket.disconnect();
      });
    });

    const errorMsg = await errorPromise;
    expect(errorMsg).toMatch(/authentication required/i);
  });

  it('2. Rejects Socket.IO connection with invalid / fake session token', async () => {
    const socket = ioClient(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: {
        token: 'fake_invalid_token_9999999999999999999999',
      },
    });

    const errorPromise = new Promise<string>((resolve) => {
      socket.on('connect_error', (err) => {
        resolve(err.message);
        socket.disconnect();
      });
    });

    const errorMsg = await errorPromise;
    expect(errorMsg).toMatch(/invalid or expired session/i);
  });

  it('3. Accepts authenticated Socket.IO connection with valid session token', async () => {
    const socket = ioClient(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: {
        token: validSessionToken,
      },
    });

    const connectPromise = new Promise<boolean>((resolve) => {
      socket.on('connect', () => {
        resolve(true);
        socket.disconnect();
      });
    });

    const connected = await connectPromise;
    expect(connected).toBe(true);
  });

  it('4. Rejects room creation API without authentication token', async () => {
    const postData = JSON.stringify({ room_name: 'Unauth Room' });

    const status = await new Promise<number>((resolve) => {
      const req = http.request(
        `${SERVER_URL}/api/rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          resolve(res.statusCode || 500);
        }
      );
      req.write(postData);
      req.end();
    });

    expect(status).toBe(401);
  });

  it('5. Successfully creates room with valid authentication token', async () => {
    const postData = JSON.stringify({ room_name: 'Pant Capitals Room' });

    const resData = await new Promise<{ status: number; body: any }>((resolve) => {
      const req = http.request(
        `${SERVER_URL}/api/rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            Authorization: `Bearer ${validSessionToken}`,
          },
        },
        (res) => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            resolve({
              status: res.statusCode || 500,
              body: JSON.parse(data),
            });
          });
        }
      );
      req.write(postData);
      req.end();
    });

    expect(resData.status).toBe(201);
    expect(resData.body.room_code).toBeDefined();
    expect(resData.body.room_code).toHaveLength(6);
  });
});
