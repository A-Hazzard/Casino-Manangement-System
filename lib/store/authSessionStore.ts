/**
 * Auth Session Store
 * Zustand store for managing temporary authentication session data.
 *
 * Features:
 * - Stores the last login password temporarily for seamless re-authentication
 * - Provides actions to set and clear the password
 * - SSR-safe with dummy state for server rendering
 *
 * @returns Zustand hook for accessing and updating auth session state.
 */
import { create } from 'zustand';

type AuthSessionStore = {
  lastLoginPassword: string | null;
  setLastLoginPassword: (password: string | null) => void;
  clearLastLoginPassword: () => void;
};

// Define a no-op version for SSR
const dummyState: AuthSessionStore = {
  lastLoginPassword: null,
  setLastLoginPassword: () => {},
  clearLastLoginPassword: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<AuthSessionStore>(set => ({
    lastLoginPassword: null,
    setLastLoginPassword: password => set({ lastLoginPassword: password }),
    clearLastLoginPassword: () => set({ lastLoginPassword: null }),
  }));
};

// Create the store conditionally
let storeInstance: ReturnType<typeof createStore> | null = null;

// Helper to ensure we use the same instance
const getClientStore = () => {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
};

// Use this store only on client side
export const useAuthSessionStore =
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);

