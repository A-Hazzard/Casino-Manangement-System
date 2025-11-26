/**
 * Movement Request Actions Store
 * Zustand store for managing movement request actions (edit/delete modals).
 *
 * Features:
 * - Tracks selected movement request and modal open/close state
 * - Provides actions to open/close edit and delete modals
 * - SSR-safe with dummy state for server rendering
 *
 * @returns Zustand hook for accessing and updating movement request actions state.
 */
import { create } from 'zustand';
import { MovementRequest } from '@/lib/types/movementRequests';

type MovementRequestActionsState = {
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  selectedMovementRequest: MovementRequest | null;
  openEditModal: (request: MovementRequest) => void;
  closeEditModal: () => void;
  openDeleteModal: (request: MovementRequest) => void;
  closeDeleteModal: () => void;
};

// Define a no-op version for SSR
const dummyState: MovementRequestActionsState = {
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  selectedMovementRequest: null,
  openEditModal: () => {},
  closeEditModal: () => {},
  openDeleteModal: () => {},
  closeDeleteModal: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<MovementRequestActionsState>(set => ({
    isEditModalOpen: false,
    isDeleteModalOpen: false,
    selectedMovementRequest: null,
    openEditModal: request =>
      set({ isEditModalOpen: true, selectedMovementRequest: request }),
    closeEditModal: () =>
      set({ isEditModalOpen: false, selectedMovementRequest: null }),
    openDeleteModal: request =>
      set({ isDeleteModalOpen: true, selectedMovementRequest: request }),
    closeDeleteModal: () =>
      set({ isDeleteModalOpen: false, selectedMovementRequest: null }),
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
export const useMovementRequestActionsStore =
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);
