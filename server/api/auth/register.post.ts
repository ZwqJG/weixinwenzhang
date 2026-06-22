import { hashPassword, createSession } from '~/server/utils/auth';
import { createUser, getUserByPhone } from '~/server/utils/user-db';
import { seedPlans, setUserPlan } from '~/server/utils/subscription-db';
import { SUPER_ADMIN_PHONE } from '~/config';

export default defineEventHandler(async event => {
  const body = await readBody<{ phone?: string; password?: string }>(event);
  const { phone, password } = body || {};

  // Validate input
  if (!phone || !password) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '手机号和密码不能为空' };
  }

  if (!/^1\d{10}$/.test(phone)) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '手机号格式不正确' };
  }

  if (password.length < 6) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '密码长度不能少于 6 位' };
  }

  if (password.length > 128) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '密码长度不能超过 128 位' };
  }

  // Reserved: super admin phone cannot be registered
  if (phone === SUPER_ADMIN_PHONE) {
    setResponseStatus(event, 403);
    return { code: -1, msg: '该手机号已被保留，无法注册' };
  }

  // Check duplicate
  const existing = await getUserByPhone(phone);
  if (existing) {
    setResponseStatus(event, 409);
    return { code: -1, msg: '该手机号已注册' };
  }

  // Create user
  const passwordHash = hashPassword(password);
  const now = Date.now();
  const created = await createUser({
    phone,
    nickname: phone,
    passwordHash,
    status: 'active',
    role: 'user',
    createdAt: now,
    updatedAt: now,
  });

  if (!created) {
    setResponseStatus(event, 500);
    return { code: -1, msg: '注册失败，请稍后重试' };
  }

  // Seed plans (idempotent) and assign free plan
  await seedPlans();
  await setUserPlan(phone, 'free');

  // Auto-login: create session
  const token = await createSession(phone);

  return {
    code: 0,
    msg: '注册成功',
    data: {
      token,
      phone,
      nickname: phone,
      role: 'user',
    },
  };
});
