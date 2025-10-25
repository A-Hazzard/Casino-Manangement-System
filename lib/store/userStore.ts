import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserAuthPayload } from '@/shared/types/auth';
import { clearUserCache } from '@/lib/utils/userCache';

type UserStore = {
  user: UserAuthPayload | null;
  setUser: (user: UserAuthPayload | null) => void;
  clearUser: () => void;
  isInitialized: boolean;
  setInitialized: (initialized: boolean) => void;
};

// SSR-safe store creation
const createStore = () => {
  return create<UserStore>()(
    persist(
      set => ({
        user: null,
        isInitialized: false,
        setUser: user => {
          set({ user });
          // Clear cache when user data changes to ensure fresh data
          if (user) {
            clearUserCache();
          }
        },
        clearUser: () => {
          set({ user: null, isInitialized: false });
          // Clear cache when user is logged out
          clearUserCache();
        },
        setInitialized: initialized => set({ isInitialized: initialized }),
      }),
      {
        name: 'user-auth-store', // Customize this name
        storage: createJSONStorage(() => {
          if (typeof window !== 'undefined') {
            return localStorage;
          }
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }),
      }
    )
  );
};

let storeInstance: ReturnType<typeof createStore> | null = null;

const getClientStore = () => {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
};

export const useUserStore =
  typeof window !== 'undefined'
    ? getClientStore()!
    : create<UserStore>(() => ({
        user: null,
        isInitialized: false,
        setUser: () => {},
        clearUser: () => {},
        setInitialized: () => {},
      }));
