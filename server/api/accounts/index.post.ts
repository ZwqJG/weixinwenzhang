import { requireAuth } from '~/server/utils/auth';
import { addSubscription } from '~/server/utils/subscription-db';

export default defineEventHandler(async event => {
  const phone = await requireAuth(event);
  const body = await readBody<{ mpFakeid?: string; mpNickname?: string }>(event);
  const { mpFakeid, mpNickname } = body || {};

  if (!mpFakeid) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '公众号标识不能为空' };
  }

  if (!mpNickname) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '公众号名称不能为空' };
  }

  const result = await addSubscription(phone, mpFakeid, mpNickname);

  if (!result.success) {
    // Quota exceeded or duplicate
    setResponseStatus(event, 409);
    return { code: -1, msg: result.reason };
  }

  return {
    code: 0,
    msg: '添加成功',
    data: result.subscription,
  };
});
