import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserStore } from "@/lib/types/store";

// Define a no-op version for SSR
const dummyState: UserStore = {
  user: null,
  setUser: () => {},
  clearUser: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  // Only create the persisted store on the client side
  return create<UserStore>()(
    persist(
      (set) => ({
        user: null,
        setUser: (user) => {
          set({ user });
        },
        clearUser: () => {
          set({ user: null });
        },
      }),
      {
        name: "user-store",
        storage: createJSONStorage(() => {
          // Check if we're in the browser
          if (typeof window !== "undefined") {
            return localStorage;
          }
          // Return a mock storage for TypeScript (this should never execute)
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }),
        onRehydrateStorage: () => {
          return (state, error) => {
            if (error) {
              console.error("User store rehydration failed:", error);
            }
          };
        },
      }
    )
  );
};

// Create the store conditionally
let storeInstance: ReturnType<typeof createStore> | null = null;

/**
 * Zustand store for managing user authentication state.
 *
 * - Persists user data in localStorage on the client.
 * - Provides setUser and clearUser actions.
 * - Returns a dummy state for SSR.
 *
 * @returns Zustand hook for accessing and updating user state.
 */
export const useUserStore = (() => {
  // Only create the persisted store on the client side
  if (typeof window !== "undefined") {
    if (!storeInstance) {
      storeInstance = createStore();
    }
    return storeInstance;
  }

  // Return a dummy store for SSR
  return create<UserStore>(() => dummyState);
})();
