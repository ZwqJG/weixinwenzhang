import { requireAuth } from '~/server/utils/auth';
import { listSubscriptions, getQuotaInfo } from '~/server/utils/subscription-db';

export default defineEventHandler(async event => {
  const phone = await requireAuth(event);
  const [subscriptions, quota] = await Promise.all([
    listSubscriptions(phone),
    getQuotaInfo(phone),
  ]);

  return {
    code: 0,
    data: {
      subscriptions,
      quota,
    },
  };
});
