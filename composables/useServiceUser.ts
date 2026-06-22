import { StorageSerializers } from '@vueuse/core';

export interface ServiceUser {
  token: string;
  phone: string;
  nickname: string;
  role: 'user' | 'admin';
}

/**
 * Service user login state, persisted in localStorage.
 */
export default () => {
  return useLocalStorage<ServiceUser | null>('service-user', null, {
    serializer: StorageSerializers.object,
  });
};
