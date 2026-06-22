export interface MpAccountRecord {
  fakeid: string;
  nickname?: string;
  round_head_img?: string;
  categoryId?: number;
}

const PREFIX = 'mpAccounts:';

function mpAccountsKey(phone: string): string {
  return `${PREFIX}${phone}`;
}

export async function getMpAccounts(phone: string): Promise<MpAccountRecord[]> {
  const kv = useStorage('kv');
  const data = await kv.get<MpAccountRecord[]>(mpAccountsKey(phone));
  return data ?? [];
}

export async function setMpAccounts(phone: string, accounts: MpAccountRecord[]): Promise<void> {
  const kv = useStorage('kv');
  await kv.set(mpAccountsKey(phone), accounts);
}

export async function addMpAccount(phone: string, account: MpAccountRecord): Promise<void> {
  const accounts = await getMpAccounts(phone);
  const idx = accounts.findIndex(a => a.fakeid === account.fakeid);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  await setMpAccounts(phone, accounts);
}

export async function removeMpAccount(phone: string, fakeid: string): Promise<boolean> {
  const accounts = await getMpAccounts(phone);
  const filtered = accounts.filter(a => a.fakeid !== fakeid);
  if (filtered.length === accounts.length) return false;
  await setMpAccounts(phone, filtered);
  return true;
}
