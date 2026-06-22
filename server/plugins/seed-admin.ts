import { hashPassword } from '../utils/auth';
import { createUser, getUserByPhone } from '../utils/user-db';
import { SUPER_ADMIN_PHONE } from '~/config';

const ADMIN_PASSWORD = 'admin888';

export default defineNitroPlugin(async () => {
  const existing = await getUserByPhone(SUPER_ADMIN_PHONE);
  if (existing) {
    if (existing.role !== 'admin') {
      console.log('[seed-admin] Upgrading existing user to admin role');
    }
    return;
  }

  const passwordHash = hashPassword(ADMIN_PASSWORD);
  const now = Date.now();
  await createUser({
    phone: SUPER_ADMIN_PHONE,
    nickname: '超级管理员',
    passwordHash,
    status: 'active',
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  });

  console.log(`[seed-admin] Super admin created (phone: ${SUPER_ADMIN_PHONE}, password: admin888)`);
});
