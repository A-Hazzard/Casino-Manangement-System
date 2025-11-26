/**
 * Custom hook for managing collection report modal states and actions
 * Handles modal visibility and state management for collection reports page
 */

import { CollectionReportModalData } from '@/lib/types/hooks';
import { useCallback, useState } from 'react';

type UseCollectionReportModalsReturn = {
  // Modal states
  isNewCollectionModalOpen: boolean;
  isEditCollectionModalOpen: boolean;
  isConfirmationDialogOpen: boolean;

  // Modal data
  selectedReport: CollectionReportModalData | null;
  confirmationData: {
    title: string;
    message: string;
    onConfirm: () => void;
  } | null;

  // Modal actions
  openNewCollectionModal: () => void;
  closeNewCollectionModal: () => void;
  openEditCollectionModal: (report: CollectionReportModalData) => void;
  closeEditCollectionModal: () => void;
  openConfirmationDialog: (data: {
    title: string;
    message: string;
    onConfirm: () => void;
  }) => void;
  closeConfirmationDialog: () => void;
};

export function useCollectionReportModals(): UseCollectionReportModalsReturn {
  // ============================================================================
  // State
  // ============================================================================

  // Modal states
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] =
    useState(false);
  const [isEditCollectionModalOpen, setIsEditCollectionModalOpen] =
    useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false);

  // Modal data
  const [selectedReport, setSelectedReport] =
    useState<CollectionReportModalData | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // ============================================================================
  // Modal Actions
  // ============================================================================

  // New collection modal actions
  const openNewCollectionModal = useCallback(() => {
    setIsNewCollectionModalOpen(true);
  }, []);

  const closeNewCollectionModal = useCallback(() => {
    setIsNewCollectionModalOpen(false);
  }, []);

  // Edit collection modal actions
  const openEditCollectionModal = useCallback(
    (report: CollectionReportModalData) => {
      setSelectedReport(report);
      setIsEditCollectionModalOpen(true);
    },
    []
  );

  const closeEditCollectionModal = useCallback(() => {
    setSelectedReport(null);
    setIsEditCollectionModalOpen(false);
  }, []);

  // Confirmation dialog actions
  const openConfirmationDialog = useCallback(
    (data: { title: string; message: string; onConfirm: () => void }) => {
      setConfirmationData(data);
      setIsConfirmationDialogOpen(true);
    },
    []
  );

  const closeConfirmationDialog = useCallback(() => {
    setConfirmationData(null);
    setIsConfirmationDialogOpen(false);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    isNewCollectionModalOpen,
    isEditCollectionModalOpen,
    isConfirmationDialogOpen,
    selectedReport,
    confirmationData,
    openNewCollectionModal,
    closeNewCollectionModal,
    openEditCollectionModal,
    closeEditCollectionModal,
    openConfirmationDialog,
    closeConfirmationDialog,
  };
}
