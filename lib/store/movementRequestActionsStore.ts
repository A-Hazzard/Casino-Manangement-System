import { create } from "zustand";
import { MovementRequest } from "@/lib/types/movementRequests";

type State = {
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  selectedMovementRequest: MovementRequest | null;
  openEditModal: (request: MovementRequest) => void;
  closeEditModal: () => void;
  openDeleteModal: (request: MovementRequest) => void;
  closeDeleteModal: () => void;
};

export const useMovementRequestActionsStore = create<State>((set) => ({
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  selectedMovementRequest: null,
  openEditModal: (request) =>
    set({ isEditModalOpen: true, selectedMovementRequest: request }),
  closeEditModal: () =>
    set({ isEditModalOpen: false, selectedMovementRequest: null }),
  openDeleteModal: (request) =>
    set({ isDeleteModalOpen: true, selectedMovementRequest: request }),
  closeDeleteModal: () =>
    set({ isDeleteModalOpen: false, selectedMovementRequest: null }),
}));
