<script setup lang="ts">
import useServiceUser from '~/composables/useServiceUser';
import useLoginAccount from '~/composables/useLoginAccount';

const router = useRouter();
const toast = useToast();
const serviceUser = useServiceUser();
const loginAccount = useLoginAccount();

const loggedIn = computed(() => !!serviceUser.value?.token);
const avatarLetter = computed(() => {
  return (serviceUser.value?.nickname || '?').charAt(0).toUpperCase();
});

function goLogin() {
  router.push('/user/login');
}

function goUserCenter() {
  router.push('/user/dashboard');
}

async function handleLogout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  }
  serviceUser.value = null;
  loginAccount.value = null;
  toast.add({ title: '已退出登录', color: 'gray' });
}

const userMenuItems = computed(() => [
  [
    { label: serviceUser.value?.nickname || '', disabled: true },
  ],
  [
    { label: '用户中心', icon: 'i-heroicons-user', click: goUserCenter },
    { label: '退出登录', icon: 'i-heroicons-arrow-right-on-rectangle', click: handleLogout },
  ],
]);
</script>

<template>
  <ul class="hidden md:flex items-center gap-5">
    <!-- 服务用户头像 / 登录 -->
    <li class="border-l border-slate-3 dark:border-slate-600 pl-5">
      <template v-if="loggedIn">
        <UDropdown :items="userMenuItems">
          <button
            class="size-8 rounded-full bg-primary-500 text-white text-sm font-semibold flex items-center justify-center hover:bg-primary-600 transition-colors cursor-pointer"
          >
            {{ avatarLetter }}
          </button>
        </UDropdown>
      </template>
      <template v-else>
        <UTooltip text="登录账号">
          <button
            @click="goLogin"
            class="size-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-600 dark:hover:text-primary-300 transition-colors cursor-pointer"
          >
            <UIcon name="i-lucide:user" class="size-5" />
          </button>
        </UTooltip>
      </template>
    </li>
  </ul>
</template>
