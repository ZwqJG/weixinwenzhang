<template>
  <USlideover v-model="isOpen" side="left" :ui="{ overlay: { background: 'bg-zinc-400/75' } }">
    <div
      class="rounded-lg divide-y divide-gray-100 dark:divide-gray-800 shadow bg-white dark:bg-gray-900 flex flex-col flex-1 overflow-y-scroll"
    >
      <div class="sticky top-0 bg-white py-4 px-2 shadow">
        <SearchAccountForm v-model="accountQuery" @search="searchAccount" />
      </div>
      <div class="flex-1">
        <ul class="divide-y antialiased">
          <li
            v-for="account in accountList"
            :key="account.fakeid"
            class="flex items-center px-2 py-4 hover:bg-slate-50 hover:cursor-pointer"
            @click="selectAccount(account)"
          >
            <img class="size-20 mr-2" :src="account.round_head_img" alt="" />
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <p class="font-semibold truncate">{{ account.nickname }}</p>
                <p class="text-sky-500 font-medium text-xs whitespace-nowrap ml-2">
                  {{ ACCOUNT_TYPE[account.service_type] }}
                </p>
              </div>
              <p class="text-gray-500 text-sm">微信号: {{ account.alias || '未设置' }}</p>
              <p class="text-sm mt-1 line-clamp-2 text-gray-600">{{ account.signature }}</p>
              <!-- 分类选择 -->
              <div class="mt-2" @click.stop>
                <USelectMenu
                  v-model="account._categoryId"
                  :options="categoryOptions"
                  value-attribute="id"
                  option-attribute="label"
                  placeholder="选择分类（可选）"
                  size="xs"
                  color="white"
                  class="max-w-[180px]"
                >
                  <template #option="{ option }">
                    <div class="flex items-center gap-2">
                      <span
                        class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: option.color || '#9CA3AF' }"
                      />
                      <span>{{ option.label }}</span>
                    </div>
                  </template>
                </USelectMenu>
              </div>
            </div>
          </li>
        </ul>

        <p v-if="loading" class="flex justify-center items-center my-2 py-2">
          <Loader :size="28" class="animate-spin text-slate-500" />
        </p>
        <p v-else-if="noMoreData" class="text-center mt-2 py-2 text-slate-400">已全部加载完毕</p>
        <button
          v-else-if="accountList.length > 0"
          @click="loadData"
          class="block mx-auto my-2 h-10 px-6 font-semibold rounded-md border border-slate-200 text-slate-900 dark:text-slate-300 hover:border-slate-400"
          type="button"
        >
          加载更多
        </button>
      </div>
    </div>
  </USlideover>
</template>

<script setup lang="ts">
import { Loader } from 'lucide-vue-next';
import { getAccountList } from '~/apis';
import LoginModal from '~/components/modal/Login.vue';
import { ACCOUNT_LIST_PAGE_SIZE, ACCOUNT_TYPE } from '~/config';
import type { AccountInfo } from '~/types/types';
import { getAllCategories, type Category } from '~/store/v2/category';

const toast = useToast();
const modal = useModal();

const isOpen = ref(false);

function openSwitcher() {
  isOpen.value = true;
}

const accountQuery = ref('');
const accountList = reactive<(AccountInfo & { _categoryId?: number })[]>([]);
const categories = ref<Category[]>([]);
let begin = 0;

const categoryOptions = computed(() => {
  const opts = categories.value.map(c => ({
    id: c.id,
    label: c.name,
    color: c.color,
  }));
  return opts;
});

// 打开时加载分类列表
watch(isOpen, async (val) => {
  if (val) {
    categories.value = await getAllCategories();
  }
});

/**
 * 搜索公众号
 */
async function searchAccount() {
  begin = 0;
  accountList.length = 0;
  noMoreData.value = false;

  await loadData();
}

const loading = ref(false);
const noMoreData = ref(false);

/**
 * 加载公众号数据
 */
async function loadData() {
  loading.value = true;

  try {
    const [accounts, completed] = await getAccountList(begin, accountQuery.value);
    accountList.push(...accounts.map(a => ({ ...a, _categoryId: undefined })));
    begin += ACCOUNT_LIST_PAGE_SIZE;
    noMoreData.value = completed;
  } catch (e: any) {
    if (e.message === 'session expired') {
      modal.open(LoginModal);
    } else {
      console.error(e);
      toast.add({
        color: 'rose',
        title: '错误',
        description: e.message,
        icon: 'i-octicon:bell-24',
      });
    }
  } finally {
    loading.value = false;
  }
}

/**
 * 选择公众号
 * @param account
 */
function selectAccount(account: AccountInfo & { _categoryId?: number }) {
  isOpen.value = false;
  emit('select:account', account, account._categoryId);
}

const emit = defineEmits<{
  'select:account': [account: AccountInfo, categoryId?: number];
}>();

defineExpose({
  open: openSwitcher,
});
</script>
