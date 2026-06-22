import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createError, getRequestHeader, H3Event, parseCookies, setResponseStatus } from 'h3';
import { getUserByPhone, type UserRecord } from '~/server/utils/user-db';

// ─── Password Hashing ────────────────────────────────────────────────────────

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const HASH_ALGO = 'scrypt';

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `${HASH_ALGO}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, hashed: string): boolean {
  const parts = hashed.split(':');
  if (parts.length !== 3 || parts[0] !== HASH_ALGO) {
    return false;
  }
  const salt = Buffer.from(parts[1], 'hex');
  const expectedHash = Buffer.from(parts[2], 'hex');
  const actualHash = scryptSync(password, salt, KEY_LENGTH);
  if (expectedHash.length !== actualHash.length) {
    return false;
  }
  return timingSafeEqual(expectedHash, actualHash);
}

// ─── Session Management ──────────────────────────────────────────────────────

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionData {
  phone: string;
  createdAt: number;
  /** auth-key of the MP (公众号) account associated with this user session */
  mpAuthKey?: string;
}

export async function createSession(phone: string): Promise<string> {
  const kv = useStorage('kv');
  const token = crypto.randomUUID().replace(/-/g, '');
  const session: SessionData = { phone, createdAt: Date.now() };
  await kv.set(`session:${token}`, session, { expirationTtl: SESSION_TTL_SECONDS });
  return token;
}

export async function getSessionByToken(token: string): Promise<SessionData | null> {
  const kv = useStorage('kv');
  try {
    const data = await kv.get<SessionData>(`session:${token}`);
    return data;
  } catch {
    return null;
  }
}

export async function destroySession(token: string): Promise<void> {
  const kv = useStorage('kv');
  await kv.del(`session:${token}`);
}

export async function updateSessionMpAuthKey(
  token: string,
  mpAuthKey: string | null,
  existingSession?: SessionData,
): Promise<void> {
  const kv = useStorage('kv');
  const session = existingSession ?? (await getSessionByToken(token));
  if (!session) return;
  const updated: SessionData = { phone: session.phone, createdAt: session.createdAt };
  if (mpAuthKey) {
    updated.mpAuthKey = mpAuthKey;
  }
  await kv.set(`session:${token}`, updated, {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

// ─── Request Helpers ─────────────────────────────────────────────────────────

export function getTokenFromRequest(event: H3Event): string | null {
  const authHeader = getRequestHeader(event, 'Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookies = parseCookies(event);
  return cookies['session-token'] || null;
}

export async function getCurrentPhone(event: H3Event): Promise<string | null> {
  const token = getTokenFromRequest(event);
  if (!token) return null;
  const session = await getSessionByToken(token);
  return session?.phone || null;
}

export async function requireAuth(event: H3Event): Promise<string> {
  const phone = await getCurrentPhone(event);
  if (!phone) {
    setResponseStatus(event, 401);
    throw createError({ statusCode: 401, statusMessage: '未登录，请先登录' });
  }
  return phone;
}

/**
 * Require the current user to be an admin.
 * Throws 403 if not authenticated or not an admin.
 */
export async function requireAdmin(event: H3Event): Promise<string> {
  const phone = await requireAuth(event);
  const user = await getUserByPhone(phone);
  if (!user || user.role !== 'admin') {
    setResponseStatus(event, 403);
    throw createError({ statusCode: 403, statusMessage: '无权访问，需要管理员权限' });
  }
  return phone;
}
