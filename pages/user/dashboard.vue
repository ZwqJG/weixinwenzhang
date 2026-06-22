<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">用户中心</h1>
          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ user?.nickname }}</span>
            <UDropdown :items="menuItems">
              <UButton color="gray" variant="ghost" icon="i-heroicons-ellipsis-vertical" />
            </UDropdown>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Quota Card -->
      <UCard class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">当前套餐</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{{ quota.planName }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-500 dark:text-gray-400">订阅配额</p>
            <p class="text-xl font-bold" :class="quota.used >= quota.max ? 'text-red-500' : 'text-green-500'">
              {{ quota.used }} / {{ quota.max }}
            </p>
          </div>
        </div>
        <UProgress
          :value="quotaPercent"
          :color="quota.used >= quota.max ? 'red' : 'primary'"
          class="mt-3"
        />
      </UCard>

      <!-- Subscription List -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">已订阅公众号</h2>
            <UButton
              size="sm"
              icon="i-heroicons-plus"
              :disabled="quota.used >= quota.max"
              @click="showAddDialog = true"
            >
              添加订阅
            </UButton>
          </div>
        </template>

        <p v-if="!subscriptions.length" class="text-center text-gray-400 dark:text-gray-500 py-8">
          暂无订阅，点击上方按钮添加
        </p>

        <div v-for="sub in subscriptions" :key="sub.id" class="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold text-sm">
              {{ sub.mpNickname.charAt(0) }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ sub.mpNickname }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                添加于 {{ formatDate(sub.createdAt) }}
              </p>
            </div>
          </div>
          <UButton
            color="red"
            variant="ghost"
            size="sm"
            icon="i-heroicons-trash"
            @click="confirmRemove(sub)"
          />
        </div>
      </UCard>
    </main>

    <!-- Add Subscription Modal -->
    <UModal v-model="showAddDialog">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">添加公众号订阅</h3>
        </template>

        <UForm :state="addForm" @submit="handleAdd">
          <UFormGroup label="公众号 ID (fakeid)" name="mpFakeid" required class="mb-4">
            <UInput v-model="addForm.mpFakeid" placeholder="输入公众号 fakeid" />
          </UFormGroup>
          <UFormGroup label="公众号名称" name="mpNickname" required class="mb-6">
            <UInput v-model="addForm.mpNickname" placeholder="输入公众号名称" />
          </UFormGroup>

          <p v-if="addError" class="text-sm text-red-500 mb-3">{{ addError }}</p>

          <div class="flex justify-end gap-3">
            <UButton color="gray" variant="soft" @click="showAddDialog = false">取消</UButton>
            <UButton :loading="addLoading" type="submit" color="primary">确认添加</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>

    <!-- Confirm Delete Modal -->
    <UModal v-model="showDeleteConfirm">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">确认取消订阅</h3>
        </template>
        <p class="text-gray-600 dark:text-gray-300 mb-4">
          确定要取消订阅「{{ deleteTargetName }}」吗？
        </p>
        <div class="flex justify-end gap-3">
          <UButton color="gray" variant="soft" @click="showDeleteConfirm = false">取消</UButton>
          <UButton :loading="deleteLoading" color="red" @click="doRemove">确认删除</UButton>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useServiceFetch } from '~/composables/useServiceFetch';
import useServiceUser from '~/composables/useServiceUser';
import useLoginAccount from '~/composables/useLoginAccount';

definePageMeta({
  layout: false,
  middleware: ['service-auth'],
});

const router = useRouter();
const serviceUser = useServiceUser();
const sf = useServiceFetch();
const loginAccount = useLoginAccount();

// ─── State ───────────────────────────────────────────────────────────────────

const user = computed(() => serviceUser.value);
const subscriptions = ref<any[]>([]);
const quota = reactive({ used: 0, max: 2, planName: '免费版' });
const loading = ref(true);

// Add subscription
const showAddDialog = ref(false);
const addForm = reactive({ mpFakeid: '', mpNickname: '' });
const addLoading = ref(false);
const addError = ref('');

// Delete confirmation
const showDeleteConfirm = ref(false);
const deleteTargetId = ref('');
const deleteTargetName = ref('');
const deleteLoading = ref(false);

// ─── Computed ────────────────────────────────────────────────────────────────

const quotaPercent = computed(() => {
  if (quota.max === 0) return 0;
  return Math.round((quota.used / quota.max) * 100);
});

const menuItems = computed(() => [
  [
    {
      label: '退出登录',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      click: handleLogout,
    },
  ],
]);

// ─── Data Loading ────────────────────────────────────────────────────────────

async function loadData() {
  loading.value = true;
  try {
    const [accountsRes] = await Promise.all([sf('/api/accounts')]);

    if (accountsRes.code === 0 && accountsRes.data) {
      subscriptions.value = accountsRes.data.subscriptions || [];
      Object.assign(quota, accountsRes.data.quota);
    }
  } catch (e) {
    console.error('Failed to load data', e);
  } finally {
    loading.value = false;
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function handleAdd() {
  addError.value = '';
  if (!addForm.mpFakeid || !addForm.mpNickname) {
    addError.value = '请填写完整信息';
    return;
  }

  addLoading.value = true;
  try {
    const res = await sf('/api/accounts', {
      method: 'POST',
      body: { mpFakeid: addForm.mpFakeid, mpNickname: addForm.mpNickname },
    });

    if (res.code === 0) {
      showAddDialog.value = false;
      addForm.mpFakeid = '';
      addForm.mpNickname = '';
      await loadData();
    } else {
      addError.value = res.msg || '添加失败';
    }
  } catch (e: any) {
    addError.value = e.data?.msg || e.message || '网络错误';
  } finally {
    addLoading.value = false;
  }
}

const toast = useToast();

function confirmRemove(sub: { id: string; mpNickname: string }) {
  deleteTargetId.value = sub.id;
  deleteTargetName.value = sub.mpNickname;
  showDeleteConfirm.value = true;
}

async function doRemove() {
  deleteLoading.value = true;
  try {
    const res = await sf(`/api/accounts/${deleteTargetId.value}`, { method: 'DELETE' });
    if (res.code === 0) {
      showDeleteConfirm.value = false;
      await loadData();
      toast.add({ title: '已取消订阅', color: 'green', timeout: 2000 });
    } else {
      toast.add({ title: res.msg || '删除失败', color: 'red', timeout: 3000 });
    }
  } catch (e: any) {
    toast.add({ title: e.data?.msg || '网络错误，请稍后重试', color: 'red', timeout: 3000 });
  } finally {
    deleteLoading.value = false;
  }
}

async function handleLogout() {
  try {
    await sf('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  }
  serviceUser.value = null;
  loginAccount.value = null;
  await router.push('/user/login');
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Init ────────────────────────────────────────────────────────────────────

onMounted(() => {
  if (!serviceUser.value) {
    router.push('/user/login');
    return;
  }
  loadData();
});
</script>
