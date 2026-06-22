import { verifyPassword, createSession } from '~/server/utils/auth';
import { getUserByPhone } from '~/server/utils/user-db';

export default defineEventHandler(async event => {
  const body = await readBody<{ phone?: string; password?: string }>(event);
  const { phone, password } = body || {};

  if (!phone || !password) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '手机号和密码不能为空' };
  }

  // Find user
  const user = await getUserByPhone(phone);
  if (!user) {
    setResponseStatus(event, 401);
    return { code: -1, msg: '手机号或密码错误' };
  }

  // Check status
  if (user.status === 'disabled') {
    setResponseStatus(event, 403);
    return { code: -1, msg: '账号已被禁用' };
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    setResponseStatus(event, 401);
    return { code: -1, msg: '手机号或密码错误' };
  }

  // Create session
  const token = await createSession(phone);

  return {
    code: 0,
    msg: '登录成功',
    data: {
      token,
      phone: user.phone,
      nickname: user.nickname,
      role: user.role,
    },
  };
});
