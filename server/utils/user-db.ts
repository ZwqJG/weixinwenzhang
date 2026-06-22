// ─── Types ───────────────────────────────────────────────────────────────────

export type UserStatus = 'active' | 'disabled';
export type UserRole = 'user' | 'admin';

export interface UserRecord {
  phone: string;
  nickname: string;
  passwordHash: string;
  status: UserStatus;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export interface UserPublicInfo {
  phone: string;
  nickname: string;
  status: UserStatus;
  role: UserRole;
  createdAt: number;
}

// ─── KV Key Helpers ──────────────────────────────────────────────────────────

const PREFIX_USER = 'user:';

function userKey(phone: string): string {
  return `${PREFIX_USER}${phone}`;
}

// ─── CRUD Operations ─────────────────────────────────────────────────────────

/**
 * Create a new user record.
 * Returns false if the phone already exists.
 */
export async function createUser(record: UserRecord): Promise<boolean> {
  const kv = useStorage('kv');
  const key = userKey(record.phone);

  // Check if already exists
  const existing = await kv.get<UserRecord>(key);
  if (existing) {
    return false;
  }

  await kv.set(key, record);
  return true;
}

/**
 * Get a user record by phone.
 */
export async function getUserByPhone(phone: string): Promise<UserRecord | null> {
  const kv = useStorage('kv');
  try {
    const data = await kv.get<UserRecord>(userKey(phone));
    if (!data) return null;
    // Backward compatibility: existing records may lack the `role` field
    if (!data.role) {
      data.role = 'user';
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Update a user record (partial update).
 * Returns false if the user doesn't exist.
 */
export async function updateUser(phone: string, updates: Partial<UserRecord>): Promise<boolean> {
  const kv = useStorage('kv');
  const existing = await getUserByPhone(phone);
  if (!existing) return false;

  const updated: UserRecord = {
    ...existing,
    ...updates,
    phone, // phone cannot change
    updatedAt: Date.now(),
  };
  await kv.set(userKey(phone), updated);
  return true;
}

/**
 * Strip sensitive fields for public API responses.
 */
export function toPublicInfo(user: UserRecord): UserPublicInfo {
  return {
    phone: user.phone,
    nickname: user.nickname,
    status: user.status,
    role: user.role,
    createdAt: user.createdAt,
  };
}
