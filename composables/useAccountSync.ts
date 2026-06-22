import { useServiceFetch } from './useServiceFetch';
import { getAllInfo, updateInfoCache } from '~/store/v2/info';
import { deleteAccountData } from '~/store/v2';
import type { MpAccount } from '~/store/v2/info';

interface MpAccountRecord {
  fakeid: string;
  nickname?: string;
  round_head_img?: string;
  categoryId?: number;
}

export default function () {
  const sf = useServiceFetch();

  async function syncFromServer(): Promise<boolean> {
    try {
      const res: any = await sf('/api/me/accounts/remote');
      if (res.code !== 0 || !Array.isArray(res.data)) return false;

      const serverAccounts: MpAccountRecord[] = res.data;

      // Always remove local accounts that no longer belong to the current user
      const existing = await getAllInfo();
      if (existing.length > 0) {
        const serverFakeids = new Set(serverAccounts.map(a => a.fakeid));
        const toRemove = existing.filter(a => !serverFakeids.has(a.fakeid));
        if (toRemove.length > 0) {
          await deleteAccountData(toRemove.map(a => a.fakeid));
        }
      }

      // Sync server accounts into local cache
      for (const sa of serverAccounts) {
        const local = existing.find(e => e.fakeid === sa.fakeid);
        if (local) {
          await updateInfoCache({
            ...local,
            nickname: sa.nickname ?? local.nickname,
            round_head_img: sa.round_head_img ?? local.round_head_img,
            categoryId: sa.categoryId ?? local.categoryId,
          });
        } else {
          await updateInfoCache({
            fakeid: sa.fakeid,
            nickname: sa.nickname,
            round_head_img: sa.round_head_img,
            categoryId: sa.categoryId,
            completed: false,
            count: 0,
            articles: 0,
            total_count: 0,
          });
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  async function pushToServer(
    fakeid: string,
    nickname?: string,
    roundHeadImg?: string,
    categoryId?: number,
  ): Promise<boolean> {
    try {
      const res: any = await sf('/api/me/accounts/remote', {
        method: 'POST',
        body: { fakeid, nickname, round_head_img: roundHeadImg, categoryId },
      });
      return res.code === 0;
    } catch {
      return false;
    }
  }

  async function removeFromServer(fakeid: string): Promise<boolean> {
    try {
      const res: any = await sf('/api/me/accounts/remote', {
        method: 'DELETE',
        body: { fakeid },
      });
      return res.code === 0;
    } catch {
      return false;
    }
  }

  return { syncFromServer, pushToServer, removeFromServer };
}
