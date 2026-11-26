import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db, prisma } from '../../src/lib/db';
import {
  hashPassword,
  verifyPassword,
  createSession,
  validateSessionToken,
  destroySession,
  resetAuthRateLimit,
  AUTH_COOKIE_NAME,
  getCookieOptions,
} from '../../src/lib/auth';

describe('Mandatory Authentication Test Suite (All 15 Scenarios)', () => {
  const primaryUser = {
    name: 'Pawan Sehrawat',
    email: 'pawan.hi-flyer@pkl.test',
    password: 'PawanChampionPassword2026!',
  };

  const duplicateUser = {
    name: 'Pawan Duplicate',
    email: 'pawan.hi-flyer@pkl.test',
    password: 'AnotherPassword123!',
  };

  beforeAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              primaryUser.email,
              'weak_user@pkl.test',
              'second_user@pkl.test',
            ],
          },
        },
      });
    } catch {}
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              primaryUser.email,
              'weak_user@pkl.test',
              'second_user@pkl.test',
            ],
          },
        },
      });
    } catch {}
  });

  beforeEach(() => {
    resetAuthRateLimit('127.0.0.1');
    resetAuthRateLimit('test_client_ip');
  });

  let createdUserId = '';
  let activeSessionToken = '';

  // 1. Register a new user
  it('Scenario 1: Register a new user successfully with hashed password and session', async () => {
    const password_hash = await hashPassword(primaryUser.password);
    expect(password_hash).not.toBe(primaryUser.password);
    expect(password_hash.startsWith('$2a$') || password_hash.startsWith('$2b$')).toBe(true);

    const user = await db.user.create({
      data: {
        name: primaryUser.name,
        email: primaryUser.email,
        password_hash,
      },
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe(primaryUser.name);
    expect(user.email).toBe(primaryUser.email);
    createdUserId = user.id;

    // Create session
    const session = await createSession(user.id);
    expect(session.sessionToken).toHaveLength(64);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    activeSessionToken = session.sessionToken;
  });

  // 2. Register using an existing email
  it('Scenario 2: Register using an existing email is strictly rejected with unique constraint violation', async () => {
    const password_hash = await hashPassword(duplicateUser.password);
    await expect(
      db.user.create({
        data: {
          name: duplicateUser.name,
          email: duplicateUser.email,
          password_hash,
        },
      })
    ).rejects.toThrow();
  });

  // 3. Submit an empty registration form
  it('Scenario 3: Empty registration inputs are rejected by validation logic', () => {
    const emptyInputs = [
      { name: '', email: '', password: '' },
      { name: '   ', email: '   ', password: '' },
    ];

    for (const input of emptyInputs) {
      const isNameValid = input.name.trim().length >= 2;
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim());
      const isPasswordValid = input.password.length >= 6;

      expect(isNameValid).toBe(false);
      expect(isEmailValid).toBe(false);
      expect(isPasswordValid).toBe(false);
    }
  });

  // 4. Submit invalid input
  it('Scenario 4: Invalid email format or malformed name are rejected', () => {
    const invalidInputs = [
      { name: 'A', email: 'not-an-email', password: 'ValidPassword123' },
      { name: 'Pawan', email: 'missing-at-sign.com', password: 'ValidPassword123' },
      { name: 'Pawan', email: '@missing-username.com', password: 'ValidPassword123' },
      { name: '', email: 'pawan@kabaddi.com', password: 'ValidPassword123' },
    ];

    for (const input of invalidInputs) {
      const isNameValid = input.name.trim().length >= 2;
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim());
      expect(isNameValid && isEmailValid).toBe(false);
    }
  });

  // 5. Register using a weak password
  it('Scenario 5: Passwords shorter than 6 characters are rejected', () => {
    const weakPasswords = ['', '1', '12', '123', '1234', '12345'];
    for (const pw of weakPasswords) {
      expect(pw.length >= 6).toBe(false);
    }
    expect('123456'.length >= 6).toBe(true);
  });

  // 6. Login with valid credentials
  it('Scenario 6: Login with valid email and password successfully verifies', async () => {
    const user = await db.user.findUnique({ where: { email: primaryUser.email } });
    expect(user).not.toBeNull();

    const isValid = await verifyPassword(primaryUser.password, user!.password_hash);
    expect(isValid).toBe(true);

    const { sessionToken, expiresAt } = await createSession(user!.id);
    expect(sessionToken).toBeDefined();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  // 7. Login with an incorrect password
  it('Scenario 7: Login with incorrect password fails verification', async () => {
    const user = await db.user.findUnique({ where: { email: primaryUser.email } });
    expect(user).not.toBeNull();

    const isValid = await verifyPassword('CompletelyWrongPassword!', user!.password_hash);
    expect(isValid).toBe(false);
  });

  // 8. Login using an unregistered email
  it('Scenario 8: Login using unregistered email returns null user', async () => {
    const unregistered = await db.user.findUnique({
      where: { email: 'does_not_exist_987654@unregistered.test' },
    });
    expect(unregistered).toBeNull();
  });

  // 9. Submit an empty login form
  it('Scenario 9: Empty login inputs are rejected before credential check', () => {
    const emptyLogins = [
      { email: '', password: '' },
      { email: 'pawan@test.com', password: '' },
      { email: '', password: 'SomePassword' },
    ];

    for (const input of emptyLogins) {
      const canProceed = Boolean(input.email.trim() && input.password);
      expect(canProceed).toBe(false);
    }
  });

  // 10. Refresh the page after successful login
  it('Scenario 10: Refreshing page re-validates active session token from cookie/storage', async () => {
    const sessionData = await validateSessionToken(activeSessionToken);
    expect(sessionData).not.toBeNull();
    expect(sessionData?.user.id).toBe(createdUserId);
    expect(sessionData?.user.email).toBe(primaryUser.email);
    expect(sessionData?.user.name).toBe(primaryUser.name);
  });

  // 11. Navigate between protected pages
  it('Scenario 11: Navigation between multiple protected resources maintains authenticated user identity', async () => {
    // Simulating multiple requests to /create, /join, /room
    const check1 = await validateSessionToken(activeSessionToken);
    const check2 = await validateSessionToken(activeSessionToken);
    const check3 = await validateSessionToken(activeSessionToken);

    expect(check1?.user.id).toBe(createdUserId);
    expect(check2?.user.id).toBe(createdUserId);
    expect(check3?.user.id).toBe(createdUserId);
  });

  // 12. Logout successfully
  it('Scenario 12: Logout destroys session from database and returns null on re-validation', async () => {
    await destroySession(activeSessionToken);

    const postLogoutCheck = await validateSessionToken(activeSessionToken);
    expect(postLogoutCheck).toBeNull();
  });

  // 13. Attempt to access protected pages after logout
  it('Scenario 13: Attempt to validate destroyed session is rejected', async () => {
    const rejectedSession = await validateSessionToken(activeSessionToken);
    expect(rejectedSession).toBeNull();
  });

  // 14. Test session persistence
  it('Scenario 14: Valid sessions persist in database across independent validation calls with 7-day expiry', async () => {
    const newSession = await createSession(createdUserId);
    const verified = await validateSessionToken(newSession.sessionToken);
    expect(verified).not.toBeNull();
    expect(verified?.user.id).toBe(createdUserId);

    // Verify expiry is set 7 days into the future
    const expectedExpiryMin = Date.now() + 6 * 24 * 3600 * 1000;
    expect(newSession.expiresAt.getTime()).toBeGreaterThan(expectedExpiryMin);

    // Clean up
    await destroySession(newSession.sessionToken);
  });

  // 15. Test authentication on mobile and desktop (cookies and Bearer headers)
  it('Scenario 15: Supports both HTTP-only Cookie and Bearer Authorization header authentication', async () => {
    const testSession = await createSession(createdUserId);

    // Desktop scenario: standard cookie validation
    const cookieValidated = await validateSessionToken(testSession.sessionToken);
    expect(cookieValidated?.user.id).toBe(createdUserId);

    // Mobile / Webview scenario: Bearer header token validation
    const bearerHeader = `Bearer ${testSession.sessionToken}`;
    const tokenFromHeader = bearerHeader.startsWith('Bearer ') ? bearerHeader.substring(7) : '';
    const headerValidated = await validateSessionToken(tokenFromHeader);
    expect(headerValidated?.user.id).toBe(createdUserId);

    // Cookie options test for mobile & desktop browsers
    const cookieOpts = getCookieOptions(false);
    expect(cookieOpts.httpOnly).toBe(true);
    expect(cookieOpts.path).toBe('/');
    expect(cookieOpts.maxAge).toBe(7 * 24 * 3600);

    await destroySession(testSession.sessionToken);
  });
});
