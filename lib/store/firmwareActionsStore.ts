import { create } from "zustand";
import type { Firmware } from "@/lib/types/firmware";

// This is a store for firmware actions (delete modal)

export type FirmwareActionsState = {
  selectedFirmware: Firmware | null;
  isDeleteModalOpen: boolean;
  isDownloadModalOpen: boolean;
  openDeleteModal: (firmware: Firmware) => void;
  closeDeleteModal: () => void;
  openDownloadModal: (firmware: Firmware) => void;
  closeDownloadModal: () => void;
};

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
  return create<FirmwareActionsState>((set) => ({
    selectedFirmware: null,
    isDeleteModalOpen: false,
    isDownloadModalOpen: false,
    openDeleteModal: (firmware) =>
      set({ selectedFirmware: firmware, isDeleteModalOpen: true }),
    closeDeleteModal: () =>
      set({ selectedFirmware: null, isDeleteModalOpen: false }),
    openDownloadModal: (firmware) =>
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
  typeof window !== "undefined" ? getClientStore() : create(() => dummyState); 