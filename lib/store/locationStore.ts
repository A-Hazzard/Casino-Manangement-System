import { create } from "zustand";
import { LocationStore } from "@/lib/types/location";

// Define a no-op version for SSR
const dummyState: LocationStore = {
  isLocationModalOpen: false,
  openLocationModal: () => {},
  closeLocationModal: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<LocationStore>((set) => ({
    isLocationModalOpen: false,
    openLocationModal: () => set({ isLocationModalOpen: true }),
    closeLocationModal: () => set({ isLocationModalOpen: false }),
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

/**
 * Zustand store for managing the state of the location modal.
 *
 * - Tracks modal open/close state.
 * - Provides actions to open and close the modal.
 * - Returns a dummy state for SSR.
 *
 * @returns Zustand hook for accessing and updating location modal state.
 */
// Use this store only on client side
export const useLocationStore =
  typeof window !== "undefined" ? getClientStore() : create(() => dummyState);
