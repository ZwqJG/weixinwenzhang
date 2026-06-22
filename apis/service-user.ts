// ─── Types (mirrors server types; defined locally for client-side safety) ────

export interface UserPublicInfo {
  phone: string;
  nickname: string;
  status: string;
  createdAt: number;
}

export interface QuotaInfo {
  used: number;
  max: number;
  planName: string;
}

export interface SubscriptionRecord {
  id: string;
  phone: string;
  mpFakeid: string;
  mpNickname: string;
  createdAt: number;
  deletedAt: number | null;
}

interface ApiResponse<T = unknown> {
  code: number;
  msg?: string;
  data?: T;
}

interface AuthResult {
  token: string;
  phone: string;
  nickname: string;
  role: 'user' | 'admin';
}

/**
 * Register a new user.
 */
export async function register(phone: string, password: string): Promise<ApiResponse<AuthResult>> {
  return $fetch<ApiResponse<AuthResult>>('/api/auth/register', {
    method: 'POST',
    body: { phone, password },
  });
}

/**
 * Login with phone + password.
 */
export async function login(phone: string, password: string): Promise<ApiResponse<AuthResult>> {
  return $fetch<ApiResponse<AuthResult>>('/api/auth/login', {
    method: 'POST',
    body: { phone, password },
  });
}

/**
 * Logout the current session.
 */
export async function logout(): Promise<ApiResponse> {
  return $fetch<ApiResponse>('/api/auth/logout', {
    method: 'POST',
  });
}

/**
 * Get current user info.
 */
export async function getMe(): Promise<ApiResponse<UserPublicInfo>> {
  return $fetch<ApiResponse<UserPublicInfo>>('/api/auth/me');
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export interface AccountListData {
  subscriptions: SubscriptionRecord[];
  quota: QuotaInfo;
}

/**
 * List all subscriptions for the current user.
 */
export async function listAccounts(): Promise<ApiResponse<AccountListData>> {
  return $fetch<ApiResponse<AccountListData>>('/api/accounts');
}

/**
 * Add a public account subscription.
 */
export async function addAccount(mpFakeid: string, mpNickname: string): Promise<ApiResponse<SubscriptionRecord>> {
  return $fetch<ApiResponse<SubscriptionRecord>>('/api/accounts', {
    method: 'POST',
    body: { mpFakeid, mpNickname },
  });
}

/**
 * Remove a subscription.
 */
export async function removeAccount(id: string): Promise<ApiResponse> {
  return $fetch<ApiResponse>(`/api/accounts/${id}`, {
    method: 'DELETE',
  });
}

// ─── Quota ───────────────────────────────────────────────────────────────────

/**
 * Get quota info.
 */
export async function getQuota(): Promise<ApiResponse<QuotaInfo>> {
  return $fetch<ApiResponse<QuotaInfo>>('/api/me/quota');
}
