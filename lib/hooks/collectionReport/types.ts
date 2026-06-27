/**
 * Collection Report Hooks - Shared Type Definitions
 *
 * Centralized types for all collection report sub-hooks.
 *
 * @module lib/hooks/collectionReport/types
 */

import type { CollectionReportMachineSummary } from '@/lib/types/api';
import type { CollectionSasMeters } from '@/lib/types/collection';
export type { SubStepProgress } from '@/components/shared/ui/ProcessingPhaseBar';

/**
 * Mobile modal state for both edit and new collection modals
 */
export type MobileModalState = {
  // Panel visibility
  isMachineListVisible: boolean;
  isFormVisible: boolean;
  isCollectedListVisible: boolean;
  isViewingFinancialForm: boolean;

  // Navigation
  navigationStack: string[];
  showViewMachineConfirmation: boolean;

  // Search
  searchTerm: string;
  collectedMachinesSearchTerm: string;

  // Editing
  editingEntryId: string | null;

  // Form data
  formData: {
    metersIn: string;
    metersOut: string;
    ramClear: boolean;
    ramClearMetersIn: string;
    ramClearMetersOut: string;
    notes: string;
    collectionTime: Date;
    showAdvancedSas: boolean;
    sasStartTime: string | Date | null;
    sasEndTime: string | Date | null;
    prevIn: string;
    prevOut: string;
  };

  // Loading/processing
  isLoadingMachines: boolean;
  isProcessing: boolean;
  isLoadingCollections: boolean;

  // Location
  selectedLocation: string | null;
  selectedLocationName: string;
  lockedLocationId: string | undefined;

  // Machine data
  availableMachines: CollectionReportMachineSummary[];
  collectedMachines: CollectionDocument[];
  originalCollections: CollectionDocument[];
  selectedMachine: string | null;
  selectedMachineData: CollectionReportMachineSummary | null;

  // Unsaved changes
  hasUnsavedEdits: boolean;

  // Financial form
  financials: MobileFinancials;
  baseBalanceCorrection: string;
  baseTaxes: string;
  baseAdvance: string;
  basePreviousBalance: string;
  baseProfitShare: string;
  baseIncludeJackpot: boolean;
};

/**
 * Mobile financials shape
 */
export type MobileFinancials = {
  taxes: string;
  advance: string;
  variance: string;
  varianceReason?: string;
  amountToCollect: string;
  collectedAmount: string;
  previousBalance: string;
  balanceCorrection: string;
  balanceCorrectionReason?: string;
  varianceReasonShortage?: string;
  reasonForShortagePayment?: string;
};

/**
 * Collection document type for hooks
 */
export type CollectionDocument = {
  _id: string;
  machineId: string;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  movement: {
    metersIn: number;
    metersOut: number;
    gross: number;
  };
  sasMeters: CollectionSasMeters | null;
  ramClear: boolean;
  ramClearMetersIn: number | null;
  ramClearMetersOut: number | null;
  notes: string | null;
  timestamp: string | Date;
  location: string;
  collector: string;
  locationReportId: string;
  isCompleted: boolean;
  collectorName?: string;
  machineName?: string;
  machineSerialNumber?: string;
  collectionTime?: string | Date;
  machineCustomName?: string;
  serialNumber?: string;
  game?: string;
};

/**
 * Navigation state for mobile modals
 */
export type MobileNavigationState = MobileModalState;

/**
 * Previous collection meters for calculations
 */
export type PreviousCollectionMeters = {
  metersIn: number;
  metersOut: number;
};

/**
 * Variation check result
 */
export type VariationCheckResult = {
  hasVariation: boolean;
  variationAmount: number;
  variationPercentage: number;
};

/**
 * Form data type for new collection
 */
export type NewCollectionFormData = {
  metersIn: string;
  metersOut: string;
  ramClear: boolean;
  ramClearMetersIn: string;
  ramClearMetersOut: string;
  notes: string;
  collectionTime: Date;
  showAdvancedSas: boolean;
  sasStartTime: string | Date | null;
  sasEndTime: string | Date | null;
  prevIn: string;
  prevOut: string;
};