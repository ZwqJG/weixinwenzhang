import { requireAuth } from '~/server/utils/auth';
import { getUserByPhone, toPublicInfo } from '~/server/utils/user-db';

export default defineEventHandler(async event => {
  const phone = await requireAuth(event);
  const user = await getUserByPhone(phone);

  if (!user) {
    setResponseStatus(event, 404);
    return { code: -1, msg: '用户不存在' };
  }

  return {
    code: 0,
    data: toPublicInfo(user),
  };
});
