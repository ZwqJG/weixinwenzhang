import { requireAuth } from '~/server/utils/auth';
import { removeMpAccount } from '~/server/utils/account-db';

export default defineEventHandler(async event => {
  const phone = await requireAuth(event);
  const body = await readBody<{ fakeid?: string }>(event);
  if (!body?.fakeid) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '缺少 fakeid' };
  }
  const removed = await removeMpAccount(phone, body.fakeid);
  if (!removed) {
    setResponseStatus(event, 404);
    return { code: -1, msg: '公众号不存在' };
  }
  return { code: 0, msg: '已移除' };
});
