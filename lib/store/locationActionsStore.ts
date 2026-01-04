import { create } from 'zustand';
import type { AggregatedLocation } from '@/shared/types';

// This is a store for location actions (edit/delete)

/**
 * Zustand store for managing location actions (edit/delete modals).
 *
 * - Tracks selected location and modal open/close state.
 * - Provides actions to open/close edit and delete modals.
 * - Returns a dummy state for SSR.
 *
 * @returns Zustand hook for accessing and updating location actions state.
 */

type LocationsActionsState = {
  selectedLocation: Partial<AggregatedLocation>;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  openEditModal: (location: Partial<AggregatedLocation>) => void;
  openDeleteModal: (location: Partial<AggregatedLocation>) => void;
  closeEditModal: () => void;
  closeDeleteModal: () => void;
};

// Define a no-op version for SSR
const dummyState: LocationsActionsState = {
  selectedLocation: {},
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  openEditModal: () => {},
  openDeleteModal: () => {},
  closeEditModal: () => {},
  closeDeleteModal: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<LocationsActionsState>(set => ({
    selectedLocation: {},
    isEditModalOpen: false,
    isDeleteModalOpen: false,
    openEditModal: location =>
      set({ selectedLocation: location, isEditModalOpen: true }),
    openDeleteModal: location =>
      set({ selectedLocation: location, isDeleteModalOpen: true }),
    closeEditModal: () => set({ isEditModalOpen: false }),
    closeDeleteModal: () => set({ isDeleteModalOpen: false }),
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
 * Zustand store for managing locations actions (edit/delete modals).
 *
 * - Tracks selected location and modal open/close state.
 * - Provides actions to open/close edit and delete modals.
 * - Returns a dummy state for SSR.
 *
 * @returns Zustand hook for accessing and updating locations actions state.
 */
// Use this store only on client side
export const useLocationsActionsStore =
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);
