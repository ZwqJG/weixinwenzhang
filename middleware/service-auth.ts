/**
 * Middleware to protect service user routes.
 * Redirects to login page if no service user is found in localStorage.
 */
export default defineNuxtRouteMiddleware((to, from) => {
  let serviceUser = null;
  try {
    const raw = localStorage.getItem('service-user');
    if (raw) {
      serviceUser = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  if (!serviceUser || !serviceUser.token) {
    const redirect = to.fullPath !== '/user/login' ? to.fullPath : undefined;
    return navigateTo({ path: '/user/login', query: redirect ? { redirect } : undefined });
  }
});
