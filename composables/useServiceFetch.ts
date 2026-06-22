export function useServiceFetch() {
  const getToken = () => {
    try {
      const raw = localStorage.getItem('service-user');
      if (!raw) return null;
      return JSON.parse(raw)?.token || null;
    } catch {
      return null;
    }
  };

  const clearSession = () => {
    localStorage.removeItem('service-user');
  };

  const api = $fetch.create({
    onRequest({ options }) {
      const token = getToken();
      if (token) {
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);
        options.headers = headers;
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        clearSession();
        const path = window.location.pathname;
        if (!path.startsWith('/user/login') && !path.startsWith('/user/register')) {
          const redirect = encodeURIComponent(path + window.location.search);
          window.location.href = `/user/login?redirect=${redirect}`;
        }
      }
    },
  });

  return api;
}
