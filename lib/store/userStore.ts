/**
 * User Store (Zustand)
 *
 * Manages user authentication state across the application using Zustand with persistence.
 *
 * Features:
 * - SSR-safe store creation (prevents hydration mismatches)
 * - Persistent storage via localStorage
 * - Automatic cache invalidation on user changes
 * - Singleton pattern for client-side store instance
 *
 * Store Pattern Explanation:
 * - `createStore()`: Factory function that creates a Zustand store with persistence middleware
 * - `storeInstance`: Singleton variable that holds the client-side store instance
 * - `getClientStore()`: Returns the singleton instance, creating it if it doesn't exist
 *   This pattern is necessary because:
 *   1. Zustand stores should be singletons (one instance per application)
 *   2. Next.js SSR requires different handling for server vs client
 *   3. Prevents multiple store instances from being created on client-side re-renders
 *
 * `isInitialized` Variable:
 * - Tracks whether the store has been hydrated from localStorage
 * - Used to prevent rendering user-dependent UI before store is ready
 * - Set to `true` after store successfully loads persisted state
 * - Set to `false` when user is cleared (logout)
 *
 * Persistence:
 * - Uses zustand's `persist` middleware with localStorage
 * - Store name: 'user-auth-store'
 * - Automatically syncs user data to/from localStorage
 * - Server-side: Returns no-op storage (no localStorage on server)
 *
 * Cache Integration:
 * - Automatically clears userCache when user data changes
 * - Ensures fresh data after login/logout
 * - Prevents stale cached data from being used
 *
 * @module lib/store/userStore
 */

import { clearUserCache } from '@/lib/utils/userCache';
import type { UserAuthPayload } from '@/shared/types/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type UserStore = {
  user: UserAuthPayload | null;
  setUser: (user: UserAuthPayload | null) => void;
  clearUser: () => void;
  isInitialized: boolean;
  setInitialized: (initialized: boolean) => void;
};

/**
 * Creates a Zustand store with persistence middleware
 * This factory function is used to create the singleton store instance
 * @returns Zustand store instance with persistence
 */
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

/**
 * Singleton store instance for client-side
 * This variable holds the single store instance to prevent multiple instances
 * from being created during client-side re-renders or hot module reloads
 */
let storeInstance: ReturnType<typeof createStore> | null = null;

/**
 * Get or create the client-side store instance (singleton pattern)
 * 
 * Why this pattern is needed:
 * - Zustand stores should be singletons (one instance per application)
 * - Prevents multiple store instances from being created
 * - Ensures all components share the same store state
 * - Required for proper state synchronization across the app
 * 
 * @returns The singleton store instance
 */
const getClientStore = () => {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
};

/**
 * User Store Hook
 * 
 * SSR-safe hook that returns the appropriate store based on environment:
 * - Client-side: Returns the singleton store instance (with persistence)
 * - Server-side: Returns a no-op store (prevents SSR errors)
 * 
 * Usage:
 * ```tsx
 * const { user, setUser, clearUser } = useUserStore();
 * ```
 */
export const useUserStore =
  typeof window !== 'undefined'
    ? getClientStore() // Client-side: use singleton with persistence
    : create<UserStore>(() => ({
        // Server-side: return no-op store to prevent SSR errors
        user: null,
        isInitialized: false,
        setUser: () => {},
        clearUser: () => {},
        setInitialized: () => {},
      }));

