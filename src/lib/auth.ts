import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db';

export const AUTH_COOKIE_NAME = 'ipl_session_token';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// In-memory rate limiting map for auth endpoints: key -> { count, resetAt }
const authRateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkAuthRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): { allowed: boolean; remainingMs?: number } {
  // Relax rate limit in development mode to prevent developer lockout on localhost
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true };
  }

  const now = Date.now();
  const record = authRateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    authRateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remainingMs: record.resetAt - now };
  }

  record.count++;
  return { allowed: true };
}

export function resetAuthRateLimit(identifier: string): void {
  authRateLimitMap.delete(identifier);
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<{ sessionToken: string; expiresAt: Date }> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.session.create({
    data: {
      session_token: sessionToken,
      user_id: userId,
      expires_at: expiresAt,
    },
  });

  return { sessionToken, expiresAt };
}

export async function validateSessionToken(token: string) {
  if (!token || typeof token !== 'string') return null;

  const session = await db.session.findUnique({
    where: { session_token: token },
    include: { user: true },
  });

  if (!session || !session.user) {
    return null;
  }

  if (new Date() > new Date(session.expires_at)) {
    await db.session.delete({ where: { session_token: token } });
    return null;
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      created_at: session.user.created_at,
    },
    sessionToken: token,
  };
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  await db.session.delete({ where: { session_token: token } });
}

export function getCookieOptions(isProduction = process.env.NODE_ENV === 'production') {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Returns raw Set-Cookie header string for raw HTTP server responses.
 * In production: HttpOnly; Secure; SameSite=None; Path=/; Max-Age=...
 * In development: HttpOnly; SameSite=Lax; Path=/; Max-Age=...
 */
export function getSetCookieHeader(sessionToken: string, isProduction = process.env.NODE_ENV === 'production'): string {
  const parts = [
    `${AUTH_COOKIE_NAME}=${sessionToken}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (isProduction) {
    parts.push('Secure');
    parts.push('SameSite=None');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

/**
 * Returns raw Set-Cookie header string to clear/expire session cookie.
 */
export function getClearCookieHeader(isProduction = process.env.NODE_ENV === 'production'): string {
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (isProduction) {
    parts.push('Secure');
    parts.push('SameSite=None');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

