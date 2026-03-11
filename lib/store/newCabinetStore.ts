import { create } from 'zustand';

type NewCabinetStore = {
  isCabinetModalOpen: boolean;
  locationId: string | null;
  openCabinetModal: (locationId?: string) => void;
  closeCabinetModal: () => void;
};

// Define a no-op version for SSR
const dummyState: NewCabinetStore = {
  isCabinetModalOpen: false,
  locationId: null,
  openCabinetModal: () => {},
  closeCabinetModal: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<NewCabinetStore>(set => ({
    isCabinetModalOpen: false,
    locationId: null,
    openCabinetModal: locationId =>
      set({ isCabinetModalOpen: true, locationId: locationId || null }),
    closeCabinetModal: () => set({ isCabinetModalOpen: false }),
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
 * Zustand store for managing the state of the new cabinet modal.
 *
 * - Tracks modal open/close state and associated locationId.
 * - Provides actions to open and close the modal.
 * - Returns a dummy state for SSR.
 *
 * @returns Zustand hook for accessing and updating new cabinet modal state.
 */
// Use this store only on client side
export const useNewCabinetStore =
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);

