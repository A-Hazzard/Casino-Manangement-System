import { create } from 'zustand';

type AuthSessionStore = {
  lastLoginPassword: string | null;
  setLastLoginPassword: (password: string | null) => void;
  clearLastLoginPassword: () => void;
};

export const useAuthSessionStore = create<AuthSessionStore>(set => ({
  lastLoginPassword: null,
  setLastLoginPassword: password => set({ lastLoginPassword: password }),
  clearLastLoginPassword: () => set({ lastLoginPassword: null }),
}));
