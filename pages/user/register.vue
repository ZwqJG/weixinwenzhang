<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">用户注册</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">注册后即可使用公众号订阅服务</p>
        </div>
      </template>

      <UForm :state="form" @submit="handleRegister">
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

        <UFormGroup label="密码" name="password" required class="mb-2">
          <UInput
            v-model="form.password"
            placeholder="请输入密码（至少 6 位）"
            type="password"
            size="lg"
            autocomplete="new-password"
          />
        </UFormGroup>

        <p class="text-xs text-gray-400 dark:text-gray-500 mb-6">
          注册即表示您同意我们的服务条款和隐私政策
        </p>

        <UButton
          :loading="loading"
          type="submit"
          block
          size="lg"
          color="primary"
        >
          注册
        </UButton>
      </UForm>

      <p v-if="errorMsg" class="mt-3 text-sm text-red-500 text-center">{{ errorMsg }}</p>
      <p v-if="successMsg" class="mt-3 text-sm text-green-500 text-center">{{ successMsg }}</p>

      <template #footer>
        <p class="text-sm text-center text-gray-500 dark:text-gray-400">
          已有账号？
          <NuxtLink to="/user/login" class="text-primary-500 hover:underline font-medium">
            立即登录
          </NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { register } from '~/apis/service-user';
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
const successMsg = ref('');

async function handleRegister() {
  errorMsg.value = '';
  successMsg.value = '';

  if (!form.phone || !form.password) {
    errorMsg.value = '请填写手机号和密码';
    return;
  }

  if (!/^1\d{10}$/.test(form.phone)) {
    errorMsg.value = '手机号格式不正确';
    return;
  }

  if (form.password.length < 6) {
    errorMsg.value = '密码长度不能少于 6 位';
    return;
  }

  loading.value = true;
  try {
    const res = await register(form.phone, form.password);
    if (res.code === 0 && res.data) {
      // Auto-login after registration
      serviceUser.value = {
        token: res.data.token,
        phone: res.data.phone,
        nickname: res.data.nickname,
        role: res.data.role,
      };
      const redirect = (route.query.redirect as string) || '/dashboard/account';
      successMsg.value = '注册成功，正在跳转...';
      setTimeout(() => router.push(redirect), 800);
    } else {
      errorMsg.value = res.msg || '注册失败';
    }
  } catch (e: any) {
    errorMsg.value = e.data?.msg || e.message || '网络错误，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>
