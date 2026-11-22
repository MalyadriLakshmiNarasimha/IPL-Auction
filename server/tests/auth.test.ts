import 'dotenv/config';
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { db, prisma } from '../../src/lib/db';
import {
  hashPassword,
  verifyPassword,
  createSession,
  validateSessionToken,
  destroySession,
  checkAuthRateLimit,
  resetAuthRateLimit,
  getCookieOptions,
  getSetCookieHeader,
  getClearCookieHeader,
  AUTH_COOKIE_NAME,
} from '../../src/lib/auth';

describe('Authentication & Session Management System - Regression Suite', () => {
  const testUser = {
    name: 'Sanju Samson',
    email: 'sanju@rajasthanroyals.com',
    password: 'SuperSecretPassword123!',
  };

  beforeAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: { in: [testUser.email, 'another_sanju@rajasthanroyals.com', 'expired_user@test.com'] } },
      });
    } catch (e) {}
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: { in: [testUser.email, 'another_sanju@rajasthanroyals.com', 'expired_user@test.com'] } },
      });
    } catch (e) {}
  });

  beforeEach(() => {
    resetAuthRateLimit('test_ip_1');
    resetAuthRateLimit('test_login_ip');
  });

  it('1. New user registration & secure password hashing', async () => {
    const password_hash = await hashPassword(testUser.password);
    expect(password_hash).not.toBe(testUser.password);
    expect(password_hash.startsWith('$2a$') || password_hash.startsWith('$2b$')).toBe(true);

    const user = await db.user.create({
      data: {
        name: testUser.name,
        email: testUser.email,
        password_hash,
      },
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('Sanju Samson');
    expect(user.email).toBe(testUser.email);
    expect(user.password_hash).toBe(password_hash);

    // Duplicate email registration must be rejected
    await expect(
      db.user.create({
        data: {
          name: 'Another Sanju',
          email: testUser.email,
          password_hash,
        },
      })
    ).rejects.toThrow();
  });

  it('2. Login with valid credentials', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    expect(user).not.toBeNull();

    const isPasswordValid = await verifyPassword(testUser.password, user!.password_hash);
    expect(isPasswordValid).toBe(true);

    // Creates exactly one session
    const { sessionToken, expiresAt } = await createSession(user!.id);
    expect(sessionToken).toHaveLength(64);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Validate that session exists
    const session = await validateSessionToken(sessionToken);
    expect(session).not.toBeNull();
    expect(session?.user.id).toBe(user!.id);
  });

  it('3. Rejection of invalid password', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    expect(user).not.toBeNull();

    const isWrongValid = await verifyPassword('IncorrectPassword123', user!.password_hash);
    expect(isWrongValid).toBe(false);

    const isBlankValid = await verifyPassword('', user!.password_hash);
    expect(isBlankValid).toBe(false);
  });

  it('4. Page refresh while authenticated (session persistence)', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    const { sessionToken } = await createSession(user!.id);

    // Simulate first page load / verification
    const firstCheck = await validateSessionToken(sessionToken);
    expect(firstCheck).not.toBeNull();
    expect(firstCheck?.user.email).toBe(testUser.email);

    // Simulate page refresh (second verification with the same cookie/token)
    const refreshCheck = await validateSessionToken(sessionToken);
    expect(refreshCheck).not.toBeNull();
    expect(refreshCheck?.user.id).toBe(firstCheck?.user.id);
    expect(refreshCheck?.user.name).toBe('Sanju Samson');
  });

  it('5. Navigation between pages while authenticated', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    const { sessionToken } = await createSession(user!.id);

    // Simulate navigating from Home -> /create -> /room/CODE
    const homeNav = await validateSessionToken(sessionToken);
    const createNav = await validateSessionToken(sessionToken);
    const roomNav = await validateSessionToken(sessionToken);

    expect(homeNav).not.toBeNull();
    expect(createNav).not.toBeNull();
    expect(roomNav).not.toBeNull();
    expect(homeNav?.user.id).toBe(createNav?.user.id);
    expect(createNav?.user.id).toBe(roomNav?.user.id);
  });

  it('6. Opening a second tab (concurrent multi-tab session validation)', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    const { sessionToken } = await createSession(user!.id);

    // Simulate Tab 1 and Tab 2 making concurrent /api/auth/me requests
    const [tab1Check, tab2Check] = await Promise.all([
      validateSessionToken(sessionToken),
      validateSessionToken(sessionToken),
    ]);

    expect(tab1Check).not.toBeNull();
    expect(tab2Check).not.toBeNull();
    expect(tab1Check?.user.id).toBe(user!.id);
    expect(tab2Check?.user.id).toBe(user!.id);
  });

  it('7. Logout cleanly destroys database session', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    const { sessionToken } = await createSession(user!.id);

    // Session is valid initially
    const beforeLogout = await validateSessionToken(sessionToken);
    expect(beforeLogout).not.toBeNull();

    // Destroy session upon logout
    await destroySession(sessionToken);

    // Database lookup confirms session is gone
    const sessionInDb = await db.session.findUnique({ where: { session_token: sessionToken } });
    expect(sessionInDb).toBeNull();
  });

  it('8. Refresh after logout rejects destroyed session', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    const { sessionToken } = await createSession(user!.id);

    await destroySession(sessionToken);

    // Simulating page refresh after logout
    const postLogoutCheck = await validateSessionToken(sessionToken);
    expect(postLogoutCheck).toBeNull();
  });

  it('9. Expired session is rejected and deleted', async () => {
    const password_hash = await hashPassword('ExpiredPass123!');
    const expiredUser = await db.user.create({
      data: {
        name: 'Expired User',
        email: 'expired_user@test.com',
        password_hash,
      },
    });

    const expiredToken = 'expired_hex_session_token_' + Date.now();
    // Create session that expired 1 hour ago
    await db.session.create({
      data: {
        session_token: expiredToken,
        user_id: expiredUser.id,
        expires_at: new Date(Date.now() - 3600000),
      },
    });

    // Validating expired session must return null and prune it
    const validated = await validateSessionToken(expiredToken);
    expect(validated).toBeNull();

    // Verify it was cleaned up
    const pruned = await db.session.findUnique({ where: { session_token: expiredToken } });
    expect(pruned).toBeNull();
  });

  it('10. Rate limiting protection (brute-force prevention)', () => {
    const ip = 'test_login_ip';

    for (let i = 0; i < 5; i++) {
      const check = checkAuthRateLimit(ip, 5, 60000);
      expect(check.allowed).toBe(true);
    }

    // 6th attempt must be blocked
    const blockedCheck = checkAuthRateLimit(ip, 5, 60000);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.remainingMs).toBeGreaterThan(0);
  });

  it('11. Session cookie creation and deletion use matching attributes', () => {
    const dummyToken = 'test_token_abc_123';

    // Production cookies must have Secure, SameSite=None, and Partitioned
    const setHeaderProd = getSetCookieHeader(dummyToken, true);
    expect(setHeaderProd).toContain(`${AUTH_COOKIE_NAME}=${dummyToken}`);
    expect(setHeaderProd).toContain('Path=/');
    expect(setHeaderProd).toContain('HttpOnly');
    expect(setHeaderProd).toContain('Secure');
    expect(setHeaderProd).toContain('SameSite=None');
    expect(setHeaderProd).toContain('Partitioned');

    const clearHeaderProd = getClearCookieHeader(true);
    expect(clearHeaderProd).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(clearHeaderProd).toContain('Path=/');
    expect(clearHeaderProd).toContain('HttpOnly');
    expect(clearHeaderProd).toContain('Secure');
    expect(clearHeaderProd).toContain('SameSite=None');
    expect(clearHeaderProd).toContain('Partitioned');
    expect(clearHeaderProd).toContain('Max-Age=0');

    // Matching attributes across set and clear
    const optionsProd = getCookieOptions(true);
    expect(optionsProd.httpOnly).toBe(true);
    expect(optionsProd.secure).toBe(true);
    expect(optionsProd.sameSite).toBe('none');
    expect(optionsProd.path).toBe('/');
  });
});
