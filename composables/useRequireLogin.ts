import useServiceUser from './useServiceUser';

/**
 * Composable to gate any operation behind service user login.
 *
 * Usage:
 *   const { requireLogin } = useRequireLogin();
 *   function handleAction() {
 *     if (!requireLogin()) return; // user not logged in, toast shown
 *     // ... perform action
 *   }
 */
export default function () {
  const router = useRouter();
  const route = useRoute();
  const toast = useToast();
  const serviceUser = useServiceUser();

  const isLoggedIn = computed(() => !!serviceUser.value?.token);

  function requireLogin(redirectToLogin = true): boolean {
    if (isLoggedIn.value) return true;

    toast.add({
      title: '请先登录账号',
      description: '使用此功能需要先登录您的账号',
      color: 'orange',
      icon: 'i-lucide:log-in',
      timeout: 4000,
    });

    if (redirectToLogin) {
      setTimeout(() => {
        router.push({ path: '/user/login', query: { redirect: route.fullPath } });
      }, 800);
    }

    return false;
  }

  return { requireLogin, isLoggedIn };
}
