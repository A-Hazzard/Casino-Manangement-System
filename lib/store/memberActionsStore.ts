import { create } from "zustand";
import { Member } from "@/lib/types/members";

// This is a store for member actions (edit/delete)

/**
 * Zustand store for managing member actions (edit/delete modals).
 *
 * - Tracks selected member and modal open/close state.
 * - Provides actions to open/close edit and delete modals.
 * - Returns a dummy state for SSR.
 *
 * @returns Zustand hook for accessing and updating member actions state.
 */

type MemberActionsState = {
  selectedMember: Partial<Member>;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  openEditModal: (member: Partial<Member>) => void;
  openDeleteModal: (member: Partial<Member>) => void;
  closeEditModal: () => void;
  closeDeleteModal: () => void;
};

// Define a no-op version for SSR
const dummyState: MemberActionsState = {
  selectedMember: {},
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  openEditModal: () => {},
  openDeleteModal: () => {},
  closeEditModal: () => {},
  closeDeleteModal: () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<MemberActionsState>((set) => ({
    selectedMember: {},
    isEditModalOpen: false,
    isDeleteModalOpen: false,
    openEditModal: (_member) =>
      set({ selectedMember: _member, isEditModalOpen: true }),
    openDeleteModal: (_member) =>
      set({ selectedMember: _member, isDeleteModalOpen: true }),
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

// Use this store only on client side
export const useMemberActionsStore =
  typeof window !== "undefined" ? getClientStore() : create(() => dummyState);
