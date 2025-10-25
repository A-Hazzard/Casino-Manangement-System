/**
 * Custom hook for managing cabinet modal states and actions
 * Handles modal visibility and state management for cabinets page
 */

import { useState, useCallback } from 'react';
type UseCabinetModalsReturn = {
  isNewMovementRequestModalOpen: boolean;
  isUploadSmibDataModalOpen: boolean;
  openNewMovementRequestModal: () => void;
  closeNewMovementRequestModal: () => void;
  openUploadSmibDataModal: () => void;
  closeUploadSmibDataModal: () => void;
};

export function useCabinetModals(): UseCabinetModalsReturn {
  // Modal state management
  const [isNewMovementRequestModalOpen, setIsNewMovementRequestModalOpen] =
    useState(false);
  const [isUploadSmibDataModalOpen, setIsUploadSmibDataModalOpen] =
    useState(false);

  // Modal handlers
  const openNewMovementRequestModal = useCallback(() => {
    setIsNewMovementRequestModalOpen(true);
  }, []);

  const closeNewMovementRequestModal = useCallback(() => {
    setIsNewMovementRequestModalOpen(false);
  }, []);

  const openUploadSmibDataModal = useCallback(() => {
    setIsUploadSmibDataModalOpen(true);
  }, []);

  const closeUploadSmibDataModal = useCallback(() => {
    setIsUploadSmibDataModalOpen(false);
  }, []);

  return {
    isNewMovementRequestModalOpen,
    isUploadSmibDataModalOpen,
    openNewMovementRequestModal,
    closeNewMovementRequestModal,
    openUploadSmibDataModal,
    closeUploadSmibDataModal,
  };
}
