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
} from '../../src/lib/auth';

describe('Authentication & Session Management System', () => {
  const testUser = {
    name: 'Sanju Samson',
    email: 'sanju@rajasthanroyals.com',
    password: 'SuperSecretPassword123!',
  };

  beforeAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: { in: [testUser.email, 'another_sanju@rajasthanroyals.com'] } },
      });
    } catch (e) {}
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: { in: [testUser.email, 'another_sanju@rajasthanroyals.com'] } },
      });
    } catch (e) {}
  });

  beforeEach(() => {
    resetAuthRateLimit('test_ip_1');
    resetAuthRateLimit('test_login_ip');
  });

  it('1. Secure Password Hashing with bcrypt', async () => {
    const hash = await hashPassword(testUser.password);
    expect(hash).not.toBe(testUser.password);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const matches = await verifyPassword(testUser.password, hash);
    expect(matches).toBe(true);

    const wrongMatches = await verifyPassword('WrongPassword!', hash);
    expect(wrongMatches).toBe(false);
  });

  it('2. User Registration & Uniqueness Enforcement', async () => {
    const password_hash = await hashPassword(testUser.password);
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

    // Duplicate email must be rejected
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

  it('3. User Authentication (Login Verification)', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    expect(user).not.toBeNull();

    // Verify correct credentials
    const isPasswordValid = await verifyPassword(testUser.password, user!.password_hash);
    expect(isPasswordValid).toBe(true);

    // Verify incorrect credentials
    const isWrongValid = await verifyPassword('IncorrectPassword123', user!.password_hash);
    expect(isWrongValid).toBe(false);
  });

  it('4. Session Creation & Validation', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    expect(user).not.toBeNull();

    const { sessionToken, expiresAt } = await createSession(user!.id);
    expect(sessionToken).toHaveLength(64); // 32 bytes hex
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Validate active session
    const validated = await validateSessionToken(sessionToken);
    expect(validated).not.toBeNull();
    expect(validated?.user.id).toBe(user!.id);
    expect(validated?.user.email).toBe(user!.email);
    expect(validated?.user.name).toBe(user!.name);
    // Never expose password hash!
    expect((validated?.user as any).password_hash).toBeUndefined();
  });

  it('5. Session Destruction (Logout)', async () => {
    const user = await db.user.findUnique({ where: { email: testUser.email } });
    const { sessionToken } = await createSession(user!.id);

    // Ensure session exists
    const beforeLogout = await validateSessionToken(sessionToken);
    expect(beforeLogout).not.toBeNull();

    // Destroy session on logout
    await destroySession(sessionToken);

    // Subsequent validation must fail
    const afterLogout = await validateSessionToken(sessionToken);
    expect(afterLogout).toBeNull();
  });

  it('6. Rate Limiting Protection (Brute-Force Prevention)', () => {
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
});
