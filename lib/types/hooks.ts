/**
 * Type definitions for custom hooks
 * Centralized types for all custom hook interfaces and return types
 */

import { ReactElement } from "react";
import { MembersView } from "@/shared/types/entities";
import { ReportView } from "@/lib/types/reports";

// Animation types
export type AnimationVariants = {
  initial: Record<string, string | number>;
  animate: Record<string, string | number>;
  exit: Record<string, string | number>;
};

export type AnimationConfig = {
  tabVariants: AnimationVariants;
};

// Tab content types
export type TabComponents<T extends string> = Record<T, ReactElement>;

export type TabAnimationProps = {
  key: string;
  variants: AnimationVariants;
  initial: string;
  animate: string;
  exit: string;
  transition: { duration: number };
  className: string;
};

// Members tab content types
export type UseMembersTabContentProps = {
  activeTab: MembersView;
  animations: AnimationConfig;
  tabComponents: TabComponents<MembersView>;
};

export type UseMembersTabContentReturn = {
  getTabAnimationProps: () => TabAnimationProps;
  isTabTransitioning: boolean;
  currentTabComponent: ReactElement;
};

// Reports tab content types
export type UseReportsTabContentProps = {
  activeView: ReportView;
  animations: AnimationConfig;
  tabComponents: TabComponents<ReportView>;
};

export type UseReportsTabContentReturn = {
  getTabAnimationProps: () => TabAnimationProps;
  isTabTransitioning: boolean;
  currentTabComponent: ReactElement;
};

// Access control types
export type TabsConfig<T extends string> = Array<{
  id: T;
  label: string;
  component?: ReactElement;
}>;

export type UseAccessReturn = {
  isAuthenticated: boolean;
  hasAccess: boolean;
  availableTabs: string[];
  accessDeniedMessage?: string;
  isLoading: boolean;
};

// Administration data types
export type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type LicenseeData = {
  id: string;
  name: string;
  code: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityLogData = {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  details?: Record<string, unknown>;
};

export type UseAdministrationDataReturn = {
  users: UserData[];
  licensees: LicenseeData[];
  activityLogs: ActivityLogData[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
};

// Modal types
export type ModalState = {
  isOpen: boolean;
  data?: Record<string, unknown>;
};

export type UseModalsReturn = {
  // User modals
  isNewUserModalOpen: boolean;
  isEditUserModalOpen: boolean;
  isDeleteUserModalOpen: boolean;
  isViewUserModalOpen: boolean;
  
  // Licensee modals
  isNewLicenseeModalOpen: boolean;
  isEditLicenseeModalOpen: boolean;
  isDeleteLicenseeModalOpen: boolean;
  isViewLicenseeModalOpen: boolean;
  
  // Activity log modals
  isViewActivityLogModalOpen: boolean;
  isExportActivityLogModalOpen: boolean;
  
  // Selected data
  selectedUser: UserData | null;
  selectedLicensee: LicenseeData | null;
  selectedActivityLog: ActivityLogData | null;
  
  // Modal handlers
  openNewUserModal: () => void;
  closeNewUserModal: () => void;
  openEditUserModal: (user: UserData) => void;
  closeEditUserModal: () => void;
  openDeleteUserModal: (user: UserData) => void;
  closeDeleteUserModal: () => void;
  openViewUserModal: (user: UserData) => void;
  closeViewUserModal: () => void;
  
  openNewLicenseeModal: () => void;
  closeNewLicenseeModal: () => void;
  openEditLicenseeModal: (licensee: LicenseeData) => void;
  closeEditLicenseeModal: () => void;
  openDeleteLicenseeModal: (licensee: LicenseeData) => void;
  closeDeleteLicenseeModal: () => void;
  openViewLicenseeModal: (licensee: LicenseeData) => void;
  closeViewLicenseeModal: () => void;
  
  openViewActivityLogModal: (activityLog: ActivityLogData) => void;
  closeViewActivityLogModal: () => void;
  openExportActivityLogModal: () => void;
  closeExportActivityLogModal: () => void;
};

// Collection report modal types
export type CollectionReportModalData = {
  id?: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  locationIds: string[];
  status: string;
};

export type UseCollectionReportModalsReturn = {
  isNewModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isConfirmationModalOpen: boolean;
  selectedReport: CollectionReportModalData | null;
  
  openNewModal: () => void;
  closeNewModal: () => void;
  openEditModal: (report: CollectionReportModalData) => void;
  closeEditModal: () => void;
  openDeleteModal: (report: CollectionReportModalData) => void;
  closeDeleteModal: () => void;
  openConfirmationModal: (report: CollectionReportModalData) => void;
  closeConfirmationModal: () => void;
};