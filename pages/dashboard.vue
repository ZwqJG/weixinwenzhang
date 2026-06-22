<template>
  <div class="flex">
    <!-- 左侧边栏 -->
    <SideBar />

    <div class="flex flex-col flex-1 overflow-hidden h-screen">
      <!-- 顶部操作栏 -->
      <div
        class="flex h-[60px] flex-shrink-0 items-center justify-between border-b border-slate-6 dark:border-slate-600 px-6"
      >
        <div id="title"></div>
        <GlobalActions />
      </div>

      <!-- 登录提示横幅 -->
      <div
        v-if="showLoginTip"
        class="flex-shrink-0 flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2 text-sm"
      >
        <div class="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <UIcon name="i-lucide:log-in" class="size-4" />
          <span>登录后可使用全部功能</span>
        </div>
        <div class="flex items-center gap-2">
          <UButton size="xs" color="amber" variant="solid" @click="goLogin">登录</UButton>
          <UButton size="xs" color="gray" variant="ghost" @click="goRegister">注册</UButton>
        </div>
      </div>

      <!-- 页面容器 -->
      <div class="flex-1 overflow-hidden">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import GlobalActions from '~/components/dashboard/Actions.vue';
import SideBar from '~/components/dashboard/SideBar.vue';
import useServiceUser from '~/composables/useServiceUser';

const router = useRouter();
const serviceUser = useServiceUser();

const showLoginTip = computed(() => !serviceUser.value?.token);

function goLogin() {
  router.push('/user/login');
}
function goRegister() {
  router.push('/user/register');
}
</script>
