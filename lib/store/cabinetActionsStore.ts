import { create } from "zustand";
import { CabinetActionsState } from "@/lib/types/cabinets";

// Define a no-op version for SSR
const dummyState: CabinetActionsState = {
  selectedCabinet: null,
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  openEditModal: () => {},
  openDeleteModal: () => {},
  closeEditModal: () => {},
  closeDeleteModal: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<CabinetActionsState>((set) => ({
    selectedCabinet: null,
    isEditModalOpen: false,
    isDeleteModalOpen: false,
    openEditModal: (cabinet) =>
      set({ selectedCabinet: cabinet, isEditModalOpen: true }),
    openDeleteModal: (cabinet) =>
      set({ selectedCabinet: cabinet, isDeleteModalOpen: true }),
    closeEditModal: () =>
      set({ selectedCabinet: null, isEditModalOpen: false }),
    closeDeleteModal: () =>
      set({ selectedCabinet: null, isDeleteModalOpen: false }),
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
 * Zustand store for managing cabinet actions (edit/delete modals).
 *
 * - Tracks selected cabinet and modal open/close state.
 * - Provides actions to open/close edit and delete modals.
 * - Returns a dummy state for SSR.
 *
 * @returns Zustand hook for accessing and updating cabinet actions state.
 */
// Use this store only on client side
export const useCabinetActionsStore =
  typeof window !== "undefined" ? getClientStore() : create(() => dummyState);
