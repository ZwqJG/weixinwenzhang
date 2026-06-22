// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanRecord {
  id: string;
  name: string;
  maxPublicAccounts: number;
  description?: string;
}

export interface UserPlanRecord {
  phone: string;
  planId: string;
  startAt: number;
  endAt: number | null; // null = never expires
}

export interface SubscriptionRecord {
  id: string;
  phone: string;
  mpFakeid: string;
  mpNickname: string;
  createdAt: number;
  deletedAt: number | null;
}

export interface QuotaInfo {
  used: number;
  max: number;
  planName: string;
}

// ─── KV Key Helpers ──────────────────────────────────────────────────────────

const PREFIX_PLAN = 'plan:';
const PREFIX_USER_PLAN = 'userPlan:';
const PREFIX_SUBSCRIPTION = 'subscription:';
const PREFIX_SUBSCRIPTION_IDX = 'subIdx:';
const PREFIX_SUB_COUNT = 'subCount:';
const PREFIX_NEXT_ID = 'subscription:nextId';

function planKey(id: string): string {
  return `${PREFIX_PLAN}${id}`;
}

function userPlanKey(phone: string): string {
  return `${PREFIX_USER_PLAN}${phone}`;
}

function subscriptionKey(id: string): string {
  return `${PREFIX_SUBSCRIPTION}${id}`;
}

function subscriptionPhoneIdxKey(phone: string): string {
  return `${PREFIX_SUBSCRIPTION_IDX}${phone}`;
}

function subscriptionCountKey(phone: string): string {
  return `${PREFIX_SUB_COUNT}${phone}`;
}

function subscriptionFakeidKey(phone: string, fakeid: string): string {
  return `subFakeid:${phone}:${fakeid}`;
}

// ─── Plan Operations ─────────────────────────────────────────────────────────

/**
 * Initialize default plans. Idempotent — only inserts if not exists.
 */
export async function seedPlans(): Promise<void> {
  const kv = useStorage('kv');
  const defaultPlans: PlanRecord[] = [
    {
      id: 'free',
      name: '免费版',
      maxPublicAccounts: 2,
      description: '永久免费，最多订阅 2 个公众号',
    },
  ];

  for (const plan of defaultPlans) {
    const existing = await kv.get<PlanRecord>(planKey(plan.id));
    if (!existing) {
      await kv.set(planKey(plan.id), plan);
    }
  }
}

/**
 * Get a plan by ID.
 */
export async function getPlan(planId: string): Promise<PlanRecord | null> {
  const kv = useStorage('kv');
  try {
    return (await kv.get<PlanRecord>(planKey(planId))) || null;
  } catch {
    return null;
  }
}

// ─── User Plan Operations ────────────────────────────────────────────────────

/**
 * Assign a plan to a user.
 */
export async function setUserPlan(phone: string, planId: string, endAt: number | null = null): Promise<void> {
  const kv = useStorage('kv');
  const record: UserPlanRecord = {
    phone,
    planId,
    startAt: Date.now(),
    endAt,
  };
  await kv.set(userPlanKey(phone), record);
}

/**
 * Get a user's current plan.
 */
export async function getUserPlan(phone: string): Promise<UserPlanRecord | null> {
  const kv = useStorage('kv');
  try {
    return (await kv.get<UserPlanRecord>(userPlanKey(phone))) || null;
  } catch {
    return null;
  }
}

/**
 * Get effective plan limits for a user.
 * Falls back to "free" plan if no explicit assignment.
 */
export async function getEffectivePlan(phone: string): Promise<PlanRecord> {
  const userPlan = await getUserPlan(phone);
  if (userPlan) {
    const plan = await getPlan(userPlan.planId);
    if (plan) return plan;
  }
  // Default fallback
  return { id: 'free', name: '免费版', maxPublicAccounts: 2 };
}

// ─── Subscription Operations ─────────────────────────────────────────────────

/**
 * Generate a sequential ID for a subscription.
 */
async function nextSubscriptionId(): Promise<string> {
  const kv = useStorage('kv');
  const current = await kv.get<number>(PREFIX_NEXT_ID);
  const next = (current || 0) + 1;
  await kv.set(PREFIX_NEXT_ID, next);
  return String(next);
}

/**
 * Add a public account subscription for a user.
 * Returns null if quota would be exceeded.
 * Returns the subscription record on success.
 */
export async function addSubscription(
  phone: string,
  mpFakeid: string,
  mpNickname: string
): Promise<{ success: boolean; reason?: string; subscription?: SubscriptionRecord }> {
  const kv = useStorage('kv');

  // 1. Check quota
  const plan = await getEffectivePlan(phone);
  const currentCount = await countActiveSubscriptions(phone);
  if (currentCount >= plan.maxPublicAccounts) {
    return {
      success: false,
      reason: `已达订阅上限 ${plan.maxPublicAccounts} 个，请升级套餐后继续添加`,
    };
  }

  // 2. Check duplicate
  const existing = await kv.get<boolean>(subscriptionFakeidKey(phone, mpFakeid));
  if (existing) {
    return { success: false, reason: '该公众号已添加' };
  }

  // 3. Create subscription
  const id = await nextSubscriptionId();
  const record: SubscriptionRecord = {
    id,
    phone,
    mpFakeid,
    mpNickname,
    createdAt: Date.now(),
    deletedAt: null,
  };

  await kv.set(subscriptionKey(id), record);

  // 4. Update indexes
  await kv.set(subscriptionFakeidKey(phone, mpFakeid), true);

  // Add to phone index
  const phoneIdx = (await kv.get<string[]>(subscriptionPhoneIdxKey(phone))) || [];
  phoneIdx.push(id);
  await kv.set(subscriptionPhoneIdxKey(phone), phoneIdx);

  // Maintain count key
  const prevCount = (await kv.get<number>(subscriptionCountKey(phone))) || 0;
  await kv.set(subscriptionCountKey(phone), prevCount + 1);

  return { success: true, subscription: record };
}

/**
 * Soft-delete a subscription by ID.
 * Returns false if the subscription doesn't belong to the user.
 */
export async function removeSubscription(phone: string, subscriptionId: string): Promise<boolean> {
  const kv = useStorage('kv');
  const record = await kv.get<SubscriptionRecord>(subscriptionKey(subscriptionId));
  if (!record || record.phone !== phone) {
    return false;
  }

  // Soft delete
  record.deletedAt = Date.now();
  await kv.set(subscriptionKey(subscriptionId), record);

  // Remove fakeid index
  await kv.del(subscriptionFakeidKey(phone, record.mpFakeid));

  // Remove from phone index to prevent unbounded growth
  const phoneIdx = (await kv.get<string[]>(subscriptionPhoneIdxKey(phone))) || [];
  const filtered = phoneIdx.filter(id => id !== subscriptionId);
  if (filtered.length !== phoneIdx.length) {
    await kv.set(subscriptionPhoneIdxKey(phone), filtered);
    // Decrement count key
    const prevCount = (await kv.get<number>(subscriptionCountKey(phone))) || 1;
    await kv.set(subscriptionCountKey(phone), Math.max(0, prevCount - 1));
  }

  return true;
}

/**
 * List all active (non-deleted) subscriptions for a user.
 */
export async function listSubscriptions(phone: string): Promise<SubscriptionRecord[]> {
  const kv = useStorage('kv');
  const phoneIdx = (await kv.get<string[]>(subscriptionPhoneIdxKey(phone))) || [];
  const results: SubscriptionRecord[] = [];

  for (const id of phoneIdx) {
    try {
      const record = await kv.get<SubscriptionRecord>(subscriptionKey(id));
      if (record && record.deletedAt === null) {
        results.push(record);
      }
    } catch {
      // skip invalid entries
    }
  }

  // Sort by createdAt descending (newest first)
  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
}

/**
 * Count active subscriptions for a user.
 * Uses the dedicated count key for O(1) performance.
 */
export async function countActiveSubscriptions(phone: string): Promise<number> {
  const kv = useStorage('kv');
  const count = await kv.get<number>(subscriptionCountKey(phone));
  return count ?? 0;
}

/**
 * Get quota info for a user.
 */
export async function getQuotaInfo(phone: string): Promise<QuotaInfo> {
  const plan = await getEffectivePlan(phone);
  const used = await countActiveSubscriptions(phone);
  return {
    used,
    max: plan.maxPublicAccounts,
    planName: plan.name,
  };
}
