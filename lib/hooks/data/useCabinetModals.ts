/**
 * Custom hook for managing cabinet modal states and actions
 * Handles modal visibility and state management for cabinets page
 */

import { useState } from 'react';
type UseCabinetModalsReturn = {
  isNewMovementRequestModalOpen: boolean;
  isUploadSmibDataModalOpen: boolean;
  openNewMovementRequestModal: () => void;
  closeNewMovementRequestModal: () => void;
  openUploadSmibDataModal: () => void;
  closeUploadSmibDataModal: () => void;
};

export function useCabinetModals(): UseCabinetModalsReturn {
  // ============================================================================
  // State & Hooks
  // ============================================================================

  // Modal state management
  const [isNewMovementRequestModalOpen, setIsNewMovementRequestModalOpen] =
    useState(false);
  const [isUploadSmibDataModalOpen, setIsUploadSmibDataModalOpen] =
    useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  // Modal handlers
  const openNewMovementRequestModal = () => {
    setIsNewMovementRequestModalOpen(true);
  };

  const closeNewMovementRequestModal = () => {
    setIsNewMovementRequestModalOpen(false);
  };

  const openUploadSmibDataModal = () => {
    setIsUploadSmibDataModalOpen(true);
  };

  const closeUploadSmibDataModal = () => {
    setIsUploadSmibDataModalOpen(false);
  };

  return {
    isNewMovementRequestModalOpen,
    isUploadSmibDataModalOpen,
    openNewMovementRequestModal,
    closeNewMovementRequestModal,
    openUploadSmibDataModal,
    closeUploadSmibDataModal,
  };
}
