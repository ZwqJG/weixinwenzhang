import { requireAuth } from '~/server/utils/auth';
import { getQuotaInfo } from '~/server/utils/subscription-db';

export default defineEventHandler(async event => {
  const phone = await requireAuth(event);
  const quota = await getQuotaInfo(phone);

  return {
    code: 0,
    data: quota,
  };
});
