/**
 * Middleware to protect admin-only dashboard routes.
 * Redirects non-admin users to the account page.
 */
import { SUPER_ADMIN_PHONE } from '~/config';

export default defineNuxtRouteMiddleware((to) => {
  const adminOnlyPaths = ['/dashboard/proxy', '/dashboard/api', '/dashboard/settings'];

  if (!adminOnlyPaths.includes(to.path)) {
    return;
  }

  let serviceUser = null;
  try {
    const raw = localStorage.getItem('service-user');
    if (raw) {
      serviceUser = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  const isAdmin = serviceUser && (serviceUser.role === 'admin' || serviceUser.phone === SUPER_ADMIN_PHONE);

  if (!isAdmin) {
    return navigateTo('/dashboard/account');
  }
});
