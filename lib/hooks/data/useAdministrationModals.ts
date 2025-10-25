/**
 * Custom hook for managing administration modal states and actions
 * Handles modal visibility and state management for administration page
 */

import { useState, useCallback } from 'react';
import { UserData, LicenseeData, ActivityLogData } from '@/lib/types/hooks';

type UseAdministrationModalsReturn = {
  // User modals
  isUserModalOpen: boolean;
  isAddUserDetailsModalOpen: boolean;
  isDeleteUserModalOpen: boolean;
  isUserActivityLogModalOpen: boolean;

  // Licensee modals
  isAddLicenseeModalOpen: boolean;
  isEditLicenseeModalOpen: boolean;
  isDeleteLicenseeModalOpen: boolean;
  isLicenseeSuccessModalOpen: boolean;
  isPaymentStatusConfirmModalOpen: boolean;

  // Activity log modals
  isActivityLogModalOpen: boolean;
  isPaymentHistoryModalOpen: boolean;

  // Modal data
  selectedUser: UserData | null;
  selectedLicensee: LicenseeData | null;
  selectedActivityLog: ActivityLogData | null;

  // User modal actions
  openUserModal: (user?: UserData) => void;
  closeUserModal: () => void;
  openAddUserDetailsModal: () => void;
  closeAddUserDetailsModal: () => void;
  openDeleteUserModal: (user: UserData) => void;
  closeDeleteUserModal: () => void;
  openUserActivityLogModal: (user: UserData) => void;
  closeUserActivityLogModal: () => void;

  // Licensee modal actions
  openAddLicenseeModal: () => void;
  closeAddLicenseeModal: () => void;
  openEditLicenseeModal: (licensee: LicenseeData) => void;
  closeEditLicenseeModal: () => void;
  openDeleteLicenseeModal: (licensee: LicenseeData) => void;
  closeDeleteLicenseeModal: () => void;
  openLicenseeSuccessModal: () => void;
  closeLicenseeSuccessModal: () => void;
  openPaymentStatusConfirmModal: (licensee: LicenseeData) => void;
  closePaymentStatusConfirmModal: () => void;

  // Activity log modal actions
  openActivityLogModal: (log: ActivityLogData) => void;
  closeActivityLogModal: () => void;
  openPaymentHistoryModal: (licensee: LicenseeData) => void;
  closePaymentHistoryModal: () => void;
};

export function useAdministrationModals(): UseAdministrationModalsReturn {
  // User modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAddUserDetailsModalOpen, setIsAddUserDetailsModalOpen] =
    useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [isUserActivityLogModalOpen, setIsUserActivityLogModalOpen] =
    useState(false);

  // Licensee modal states
  const [isAddLicenseeModalOpen, setIsAddLicenseeModalOpen] = useState(false);
  const [isEditLicenseeModalOpen, setIsEditLicenseeModalOpen] = useState(false);
  const [isDeleteLicenseeModalOpen, setIsDeleteLicenseeModalOpen] =
    useState(false);
  const [isLicenseeSuccessModalOpen, setIsLicenseeSuccessModalOpen] =
    useState(false);
  const [isPaymentStatusConfirmModalOpen, setIsPaymentStatusConfirmModalOpen] =
    useState(false);

  // Activity log modal states
  const [isActivityLogModalOpen, setIsActivityLogModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] =
    useState(false);

  // Modal data
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedLicensee, setSelectedLicensee] = useState<LicenseeData | null>(
    null
  );
  const [selectedActivityLog, setSelectedActivityLog] =
    useState<ActivityLogData | null>(null);

  // User modal actions
  const openUserModal = useCallback((user?: UserData) => {
    setSelectedUser(user || null);
    setIsUserModalOpen(true);
  }, []);

  const closeUserModal = useCallback(() => {
    setSelectedUser(null);
    setIsUserModalOpen(false);
  }, []);

  const openAddUserDetailsModal = useCallback(() => {
    setIsAddUserDetailsModalOpen(true);
  }, []);

  const closeAddUserDetailsModal = useCallback(() => {
    setIsAddUserDetailsModalOpen(false);
  }, []);

  const openDeleteUserModal = useCallback((user: UserData) => {
    setSelectedUser(user);
    setIsDeleteUserModalOpen(true);
  }, []);

  const closeDeleteUserModal = useCallback(() => {
    setSelectedUser(null);
    setIsDeleteUserModalOpen(false);
  }, []);

  const openUserActivityLogModal = useCallback((user: UserData) => {
    setSelectedUser(user);
    setIsUserActivityLogModalOpen(true);
  }, []);

  const closeUserActivityLogModal = useCallback(() => {
    setSelectedUser(null);
    setIsUserActivityLogModalOpen(false);
  }, []);

  // Licensee modal actions
  const openAddLicenseeModal = useCallback(() => {
    setIsAddLicenseeModalOpen(true);
  }, []);

  const closeAddLicenseeModal = useCallback(() => {
    setIsAddLicenseeModalOpen(false);
  }, []);

  const openEditLicenseeModal = useCallback((licensee: LicenseeData) => {
    setSelectedLicensee(licensee);
    setIsEditLicenseeModalOpen(true);
  }, []);

  const closeEditLicenseeModal = useCallback(() => {
    setSelectedLicensee(null);
    setIsEditLicenseeModalOpen(false);
  }, []);

  const openDeleteLicenseeModal = useCallback((licensee: LicenseeData) => {
    setSelectedLicensee(licensee);
    setIsDeleteLicenseeModalOpen(true);
  }, []);

  const closeDeleteLicenseeModal = useCallback(() => {
    setSelectedLicensee(null);
    setIsDeleteLicenseeModalOpen(false);
  }, []);

  const openLicenseeSuccessModal = useCallback(() => {
    setIsLicenseeSuccessModalOpen(true);
  }, []);

  const closeLicenseeSuccessModal = useCallback(() => {
    setIsLicenseeSuccessModalOpen(false);
  }, []);

  const openPaymentStatusConfirmModal = useCallback(
    (licensee: LicenseeData) => {
      setSelectedLicensee(licensee);
      setIsPaymentStatusConfirmModalOpen(true);
    },
    []
  );

  const closePaymentStatusConfirmModal = useCallback(() => {
    setSelectedLicensee(null);
    setIsPaymentStatusConfirmModalOpen(false);
  }, []);

  // Activity log modal actions
  const openActivityLogModal = useCallback((log: ActivityLogData) => {
    setSelectedActivityLog(log);
    setIsActivityLogModalOpen(true);
  }, []);

  const closeActivityLogModal = useCallback(() => {
    setSelectedActivityLog(null);
    setIsActivityLogModalOpen(false);
  }, []);

  const openPaymentHistoryModal = useCallback((licensee: LicenseeData) => {
    setSelectedLicensee(licensee);
    setIsPaymentHistoryModalOpen(true);
  }, []);

  const closePaymentHistoryModal = useCallback(() => {
    setSelectedLicensee(null);
    setIsPaymentHistoryModalOpen(false);
  }, []);

  return {
    // User modals
    isUserModalOpen,
    isAddUserDetailsModalOpen,
    isDeleteUserModalOpen,
    isUserActivityLogModalOpen,

    // Licensee modals
    isAddLicenseeModalOpen,
    isEditLicenseeModalOpen,
    isDeleteLicenseeModalOpen,
    isLicenseeSuccessModalOpen,
    isPaymentStatusConfirmModalOpen,

    // Activity log modals
    isActivityLogModalOpen,
    isPaymentHistoryModalOpen,

    // Modal data
    selectedUser,
    selectedLicensee,
    selectedActivityLog,

    // User modal actions
    openUserModal,
    closeUserModal,
    openAddUserDetailsModal,
    closeAddUserDetailsModal,
    openDeleteUserModal,
    closeDeleteUserModal,
    openUserActivityLogModal,
    closeUserActivityLogModal,

    // Licensee modal actions
    openAddLicenseeModal,
    closeAddLicenseeModal,
    openEditLicenseeModal,
    closeEditLicenseeModal,
    openDeleteLicenseeModal,
    closeDeleteLicenseeModal,
    openLicenseeSuccessModal,
    closeLicenseeSuccessModal,
    openPaymentStatusConfirmModal,
    closePaymentStatusConfirmModal,

    // Activity log modal actions
    openActivityLogModal,
    closeActivityLogModal,
    openPaymentHistoryModal,
    closePaymentHistoryModal,
  };
}
