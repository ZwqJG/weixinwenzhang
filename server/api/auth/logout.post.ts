import { getTokenFromRequest, getSessionByToken, destroySession } from '~/server/utils/auth';
import { cookieStore } from '~/server/utils/CookieStore';
import { delMpCookie } from '~/server/kv/cookie';

export default defineEventHandler(async event => {
  const token = getTokenFromRequest(event);
  if (token) {
    // 清理该用户关联的 MP（公众号）登录状态（不影响 session 销毁）
    try {
      const session = await getSessionByToken(token);
      if (session?.mpAuthKey) {
        cookieStore.removeCookie(session.mpAuthKey);
        await delMpCookie(session.mpAuthKey);
      }
    } catch (e) {
      console.error('清理 MP 登录状态失败:', e);
    }
    await destroySession(token);
  }

  return { code: 0, msg: '已退出登录' };
});
