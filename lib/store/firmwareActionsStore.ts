/**
 * Firmware Actions Store
 * Zustand store for managing firmware actions (delete/download modals).
 *
 * Features:
 * - Tracks selected firmware and modal open/close state
 * - Provides actions to open/close delete and download modals
 * - SSR-safe with dummy state for server rendering
 *
 * @returns Zustand hook for accessing and updating firmware actions state.
 */
import { create } from 'zustand';
import type { FirmwareActionsState } from '@/lib/types/store';

// Re-export frontend-specific types for convenience
export type { FirmwareActionsState };

// Define a no-op version for SSR
const dummyState: FirmwareActionsState = {
  selectedFirmware: null,
  isDeleteModalOpen: false,
  isDownloadModalOpen: false,
  openDeleteModal: () => {},
  closeDeleteModal: () => {},
  openDownloadModal: () => {},
  closeDownloadModal: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<FirmwareActionsState>(set => ({
    selectedFirmware: null,
    isDeleteModalOpen: false,
    isDownloadModalOpen: false,
    openDeleteModal: firmware =>
      set({ selectedFirmware: firmware, isDeleteModalOpen: true }),
    closeDeleteModal: () =>
      set({ selectedFirmware: null, isDeleteModalOpen: false }),
    openDownloadModal: firmware =>
      set({ selectedFirmware: firmware, isDownloadModalOpen: true }),
    closeDownloadModal: () =>
      set({ selectedFirmware: null, isDownloadModalOpen: false }),
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
export const useFirmwareActionsStore =
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);
