import { hashPassword } from '~/server/utils/auth';
import { createUser, getUserByPhone, updateUser } from '~/server/utils/user-db';
import { SUPER_ADMIN_PHONE } from '~/config';

const DEFAULT_PASSWORD = 'admin888'; // Change after first login if needed

export default defineEventHandler(async event => {
  const body = await readBody<{ password?: string }>(event);
  const password = body?.password || DEFAULT_PASSWORD;

  if (password.length < 6) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '密码长度不能少于 6 位' };
  }

  const existing = await getUserByPhone(SUPER_ADMIN_PHONE);

  if (existing) {
    const updates: Partial<typeof existing> = {};
    if (existing.role !== 'admin') {
      updates.role = 'admin';
    }
    // Always update password hash to ensure it matches
    updates.passwordHash = hashPassword(password);
    await updateUser(SUPER_ADMIN_PHONE, updates);

    return {
      code: 0,
      msg: '超级管理员账号已存在，密码已重置',
      data: { phone: SUPER_ADMIN_PHONE, role: 'admin' },
    };
  }

  const passwordHash = hashPassword(password);
  const now = Date.now();
  const created = await createUser({
    phone: SUPER_ADMIN_PHONE,
    nickname: '超级管理员',
    passwordHash,
    status: 'active',
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  });

  if (!created) {
    setResponseStatus(event, 500);
    return { code: -1, msg: '创建超级管理员失败' };
  }

  return {
    code: 0,
    msg: '超级管理员创建成功',
    data: { phone: SUPER_ADMIN_PHONE, role: 'admin' },
  };
});
