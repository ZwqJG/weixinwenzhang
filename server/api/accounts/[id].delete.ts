import { requireAuth } from '~/server/utils/auth';
import { removeSubscription } from '~/server/utils/subscription-db';

export default defineEventHandler(async event => {
  const phone = await requireAuth(event);
  const id = event.context.params?.id;

  if (!id) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '缺少订阅 ID' };
  }

  const removed = await removeSubscription(phone, id);
  if (!removed) {
    setResponseStatus(event, 404);
    return { code: -1, msg: '订阅不存在或无权操作' };
  }

  return { code: 0, msg: '删除成功' };
});
