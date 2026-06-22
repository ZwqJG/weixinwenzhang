import { requireAuth } from '~/server/utils/auth';
import { addMpAccount } from '~/server/utils/account-db';

export default defineEventHandler(async event => {
  const phone = await requireAuth(event);
  const body = await readBody<{ fakeid?: string; nickname?: string; round_head_img?: string; categoryId?: number }>(event);
  if (!body?.fakeid) {
    setResponseStatus(event, 400);
    return { code: -1, msg: '缺少 fakeid' };
  }
  await addMpAccount(phone, {
    fakeid: body.fakeid,
    nickname: body.nickname,
    round_head_img: body.round_head_img,
    categoryId: body.categoryId,
  });
  return { code: 0, msg: '已同步' };
});
