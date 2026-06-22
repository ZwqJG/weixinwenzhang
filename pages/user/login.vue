<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">用户登录</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">欢迎回来，请登录您的账号</p>
        </div>
      </template>

      <UForm :state="form" @submit="handleLogin">
        <UFormGroup label="手机号" name="phone" required class="mb-4">
          <UInput
            v-model="form.phone"
            placeholder="请输入手机号"
            type="tel"
            maxlength="11"
            size="lg"
            autocomplete="username"
          />
        </UFormGroup>

        <UFormGroup label="密码" name="password" required class="mb-6">
          <UInput
            v-model="form.password"
            placeholder="请输入密码"
            type="password"
            size="lg"
            autocomplete="current-password"
          />
        </UFormGroup>

        <UButton
          :loading="loading"
          type="submit"
          block
          size="lg"
          color="primary"
        >
          登录
        </UButton>
      </UForm>

      <p v-if="errorMsg" class="mt-3 text-sm text-red-500 text-center">{{ errorMsg }}</p>

      <template #footer>
        <p class="text-sm text-center text-gray-500 dark:text-gray-400">
          还没有账号？
          <NuxtLink to="/user/register" class="text-primary-500 hover:underline font-medium">
            立即注册
          </NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { login } from '~/apis/service-user';
import useServiceUser from '~/composables/useServiceUser';

definePageMeta({
  layout: false,
});

const router = useRouter();
const route = useRoute();
const serviceUser = useServiceUser();

const form = reactive({
  phone: '',
  password: '',
});
const loading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
  errorMsg.value = '';

  if (!form.phone || !form.password) {
    errorMsg.value = '请填写手机号和密码';
    return;
  }

  loading.value = true;
  try {
    const res = await login(form.phone, form.password);
    if (res.code === 0 && res.data) {
      serviceUser.value = {
        token: res.data.token,
        phone: res.data.phone,
        nickname: res.data.nickname,
        role: res.data.role,
      };
      const redirect = (route.query.redirect as string) || '/dashboard/account';
      await router.push(redirect);
    } else {
      errorMsg.value = res.msg || '登录失败';
    }
  } catch (e: any) {
    errorMsg.value = e.data?.msg || e.message || '网络错误，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>
