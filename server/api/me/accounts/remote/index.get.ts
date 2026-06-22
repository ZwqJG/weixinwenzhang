import { requireAuth } from '~/server/utils/auth';
import { getMpAccounts } from '~/server/utils/account-db';

export default defineEventHandler(async event => {
  const phone = await requireAuth(event);
  const accounts = await getMpAccounts(phone);
  return { code: 0, data: accounts };
});
