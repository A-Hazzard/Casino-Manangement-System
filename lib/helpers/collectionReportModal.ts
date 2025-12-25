/**
 * Collection Report Modal Helper Functions
 *
 * Provides helper functions for the collection report modal, including data fetching,
 * machine collection management, validation, animations, and report creation. It handles
 * all operations related to creating and managing collection reports through the modal interface.
 *
 * Features:
 * - Fetches in-progress collections for collectors.
 * - Adds and deletes machine collection entries.
 * - Validates machine entry data including RAM clear scenarios.
 * - Applies GSAP animations to modal transitions.
 * - Handles collection report creation and submission.
 */

import { gsap } from 'gsap';
import { toast } from 'sonner';
import axios from 'axios';
import type {
  CollectionDocument,
} from '@/lib/types/collections';
import type {
  CollectionReportMachineSummary,
  CreateCollectionReportPayload,
} from '@/lib/types/api';
import { validateCollectionReportPayload } from '@/lib/utils/validation';
import { createCollectionReport } from '@/lib/helpers/collectionReport';
import { validateRamClearMeters } from '@/lib/utils/ramClearValidation';

// ============================================================================
// Collection Data Fetching
// ============================================================================

/**
 * Fetches in-progress collections for a collector
 * @param collector - Collector user ID
 * @returns Promise resolving to array of collection documents
 */
export async function fetchInProgressCollections(
  collector: string
): Promise<CollectionDocument[]> {
  const res = await axios.get(
    `/api/collections?collector=${collector}&isCompleted=false`
  );
  return res.data;
}

// ============================================================================
// Machine Collection Operations
// ============================================================================

/**
 * Adds a new machine collection entry
 * @param data - Partial collection document data
 * @returns Promise resolving to created collection document
 */
export async function addMachineCollection(
  data: Partial<CollectionDocument>
): Promise<CollectionDocument> {
  const res = await axios.post('/api/collections', data);
  return res.data;
}

// ============================================================================
// Machine Collection Deletion
// ============================================================================

/**
 * Deletes a machine collection entry
 * @param id - Collection document ID
 * @returns Promise resolving to success status
 */
export async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  const res = await axios.delete(`/api/collections?id=${id}`);
  return res.data;
}

// ============================================================================
// Modal Animation
// ============================================================================

/**
 * Applies GSAP animation to modal
 * @param modalRef - React ref to modal element
 * @param show - Whether modal is showing or hiding
 * @param onComplete - Callback to execute on animation complete
 */
export function animateModal(
  modalRef: React.RefObject<HTMLDivElement | null>,
  show: boolean,
  onComplete?: () => void
) {
  if (show && modalRef.current) {
    gsap.fromTo(
      modalRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
    );
  } else if (!show && modalRef.current) {
    gsap.to(modalRef.current, {
      opacity: 0,
      scale: 0.95,
      duration: 0.2,
      ease: 'power2.in',
      onComplete,
    });
  }
}

/**
 * Validates machine entry data
 * @param selectedMachineId - Selected machine ID
 * @param machineForDataEntry - Machine data for entry
 * @param currentMetersIn - Current meters in value
 * @param currentMetersOut - Current meters out value
 * @param userId - User ID
 * @returns Validation result with isValid flag and error message
 */
export function validateMachineEntry(
  selectedMachineId: string | undefined,
  machineForDataEntry: CollectionReportMachineSummary | undefined,
  currentMetersIn: string,
  currentMetersOut: string,
  userId: string | undefined,
  ramClear?: boolean,
  prevIn?: number,
  prevOut?: number,
  ramClearMetersIn?: number,
  ramClearMetersOut?: number,
  isEditMode?: boolean // Add parameter to indicate edit mode
): { isValid: boolean; error?: string; warnings?: string[] } {
  // In edit mode, we only need selectedMachineId, not machineForDataEntry
  if (!selectedMachineId) {
    return { isValid: false, error: 'Please select a machine first.' };
  }

  // In normal mode (not edit), we need both selectedMachineId and machineForDataEntry
  if (!isEditMode && !machineForDataEntry) {
    return { isValid: false, error: 'Please select a machine first.' };
  }

  if (
    currentMetersIn.trim() === '' ||
    !/^-?\d*\.?\d*$/.test(currentMetersIn.trim())
  ) {
    return { isValid: false, error: 'Meters In must be a valid number.' };
  }

  if (
    currentMetersOut.trim() === '' ||
    !/^-?\d*\.?\d*$/.test(currentMetersOut.trim())
  ) {
    return { isValid: false, error: 'Meters Out must be a valid number.' };
  }

  if (!userId) {
    return { isValid: false, error: 'User not found.' };
  }

  const metersIn = Number(currentMetersIn);
  const metersOut = Number(currentMetersOut);

  if (isNaN(metersIn) || isNaN(metersOut)) {
    return { isValid: false, error: 'Invalid meter values' };
  }

  // RAM Clear validation if parameters are provided
  if (ramClear !== undefined && prevIn !== undefined && prevOut !== undefined) {
    const ramClearValidation = validateRamClearMeters({
      currentMetersIn: metersIn,
      currentMetersOut: metersOut,
      prevIn,
      prevOut,
      ramClear,
      ramClearMetersIn,
      ramClearMetersOut,
    });

    if (!ramClearValidation.isValid) {
      return {
        isValid: false,
        error: ramClearValidation.errors.join(', '),
        warnings: ramClearValidation.warnings,
      };
    }

    if (ramClearValidation.warnings.length > 0) {
      return {
        isValid: true,
        warnings: ramClearValidation.warnings,
      };
    }
  }

  return { isValid: true };
}

/**
 * Creates entry data for machine collection
 * @param params - Parameters for creating entry data
 * @returns Collection document entry data
 */
export function createMachineEntryData(params: {
  selectedMachineId: string;
  machineForDataEntry: CollectionReportMachineSummary;
  currentCollectionTime: Date | undefined;
  currentMetersIn: string;
  currentMetersOut: string;
  currentMachineNotes: string;
  currentRamClear: boolean;
  prevIn: number | null;
  prevOut: number | null;
  userId: string;
  selectedLocationName: string;
  selectedLocationId: string | undefined;
}): Partial<CollectionDocument> {
  const metersIn = Number(params.currentMetersIn);
  const metersOut = Number(params.currentMetersOut);

  return {
    _id: '', // Will be set by the database
    machineId: params.selectedMachineId,
    machineName: params.machineForDataEntry.name,
    machineCustomName: params.selectedMachineId,
    serialNumber: params.machineForDataEntry.serialNumber,
    timestamp: params.currentCollectionTime
      ? new Date(params.currentCollectionTime)
      : new Date(),
    metersIn,
    metersOut,
    prevIn: params.prevIn || 0,
    prevOut: params.prevOut || 0,
    softMetersIn: metersIn,
    softMetersOut: metersOut,
    notes: params.currentMachineNotes,
    ramClear: params.currentRamClear,
    isCompleted: false,
    collector: params.userId,
    location: params.selectedLocationName,
    locationReportId: params.selectedLocationId || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
    sasMeters: {
      machine: params.machineForDataEntry.name,
      drop: 0,
      totalCancelledCredits: 0,
      gross: 0,
      gamesPlayed: 0,
      jackpot: 0,
      sasStartTime: '',
      sasEndTime: '',
    },
    movement: {
      metersIn,
      metersOut,
      gross: metersIn - metersOut,
    },
  };
}

/**
 * Validates financial fields completeness
 * @param financials - Financial data object
 * @returns Boolean indicating if all fields are filled
 */
export function validateFinancialFields(financials: {
  taxes: string;
  advance: string;
  variance: string;
  varianceReason: string;
  amountToCollect: string;
  collectedAmount: string;
  balanceCorrection: string;
  balanceCorrectionReason: string;
  previousBalance: string;
  reasonForShortagePayment: string;
}): boolean {
  // Only amount to collect and balance correction are required
  return Boolean(
    financials.amountToCollect.trim() !== '' &&
      financials.balanceCorrection.trim() !== ''
  );
}

/**
 * Creates collection report payload for a machine entry
 * @param entry - Collection document entry
 * @param financials - Financial data
 * @param userEmail - User email address
 * @param selectedLocationName - Location name
 * @param selectedLocationId - Location ID
 * @returns Collection report payload
 */
export function createCollectionReportPayload(
  entry: CollectionDocument,
  financials: {
    taxes: string;
    advance: string;
    variance: string;
    varianceReason: string;
    amountToCollect: string;
    collectedAmount: string;
    balanceCorrection: string;
    balanceCorrectionReason: string;
    previousBalance: string;
    reasonForShortagePayment: string;
  },
  userEmail: string,
  selectedLocationName: string,
  selectedLocationId: string
): CreateCollectionReportPayload {
  const machineEntry = {
    machineId: entry.machineId,
    machineName: entry.machineName,
    collectionTime:
      entry.timestamp instanceof Date
        ? entry.timestamp.toISOString()
        : new Date(entry.timestamp).toISOString(),
    metersIn: entry.metersIn,
    metersOut: entry.metersOut,
    notes: entry.notes,
    useCustomTime: true,
    selectedDate:
      entry.timestamp instanceof Date
        ? entry.timestamp.toISOString().split('T')[0]
        : new Date(entry.timestamp).toISOString().split('T')[0],
    timeHH:
      entry.timestamp instanceof Date
        ? String(entry.timestamp.getHours()).padStart(2, '0')
        : String(new Date(entry.timestamp).getHours()).padStart(2, '0'),
    timeMM:
      entry.timestamp instanceof Date
        ? String(entry.timestamp.getMinutes()).padStart(2, '0')
        : String(new Date(entry.timestamp).getMinutes()).padStart(2, '0'),
  };

  return {
    variance: Number(financials.variance) || 0,
    previousBalance: Number(financials.previousBalance) || 0,
    currentBalance: 0,
    amountToCollect: Number(financials.amountToCollect) || 0,
    amountCollected: Number(financials.collectedAmount) || 0,
    amountUncollected: 0,
    partnerProfit: 0,
    taxes: Number(financials.taxes) || 0,
    advance: Number(financials.advance) || 0,
    collectorName: userEmail || 'N/A',
    locationName: selectedLocationName,
    locationReportId: selectedLocationId || '',
    location: selectedLocationId || '',
    totalDrop: 0,
    totalCancelled: 0,
    totalGross: 0,
    totalSasGross: 0,
    timestamp: new Date().toISOString(),
    varianceReason: financials.varianceReason,
    reasonShortagePayment: financials.reasonForShortagePayment,
    balanceCorrection: Number(financials.balanceCorrection) || 0,
    balanceCorrectionReas: financials.balanceCorrectionReason,
    machines: [
      {
        ...machineEntry,
        prevMetersIn: 0,
        prevMetersOut: 0,
        timestamp: entry.timestamp,
        locationReportId: selectedLocationId || '',
      },
    ],
  };
}

/**
 * Processes multiple collection report creation
 * @param collectedMachineEntries - Array of collected machine entries
 * @param financials - Financial data
 * @param userEmail - User email address
 * @param selectedLocationName - Location name
 * @param selectedLocationId - Location ID
 * @returns Promise resolving to creation results
 */
export async function processMultipleReports(
  collectedMachineEntries: CollectionDocument[],
  financials: {
    taxes: string;
    advance: string;
    variance: string;
    varianceReason: string;
    amountToCollect: string;
    collectedAmount: string;
    balanceCorrection: string;
    balanceCorrectionReason: string;
    previousBalance: string;
    reasonForShortagePayment: string;
  },
  userEmail: string,
  selectedLocationName: string,
  selectedLocationId: string
): Promise<{
  successCount: number;
  totalCount: number;
  successfulIds: string[];
}> {
  const reportCreationPromises = collectedMachineEntries.map(entry => {
    const payload = createCollectionReportPayload(
      entry,
      financials,
      userEmail,
      selectedLocationName,
      selectedLocationId
    );

    const validation = validateCollectionReportPayload(payload);
    if (!validation.isValid) {
      console.error(
        'Validation failed for machine:',
        entry.machineName,
        validation.errors
      );
      return Promise.reject({
        machineName: entry.machineName,
        errors: validation.errors,
      });
    }
    return createCollectionReport(payload);
  });

  toast.loading('Creating reports...', { id: 'create-reports-toast' });
  const results = await Promise.allSettled(reportCreationPromises);
  toast.dismiss('create-reports-toast');

  let successCount = 0;
  const successfulIds: string[] = [];

  results.forEach((result, index) => {
    const machineName =
      collectedMachineEntries[index]?.machineName || `Entry ${index + 1}`;
    if (result.status === 'fulfilled') {
      toast.success(`Report for ${machineName} created successfully!`);
      successCount++;
      successfulIds.push(collectedMachineEntries[index]._id);
    } else {
      const errorReason = result.reason as {
        errors?: string[];
        message?: string;
      };
      const errorMessages = errorReason?.errors
        ? errorReason.errors.join(', ')
        : errorReason?.message || 'Unknown error';
      toast.error(
        `Failed to create report for ${machineName}: ${errorMessages}`
      );
      console.error(`Error for ${machineName}:`, result.reason);
    }
  });

  return {
    successCount,
    totalCount: collectedMachineEntries.length,
    successfulIds,
  };
}

/**
 * Creates collection document payload for data entry
 * @param params - Collection data entry parameters
 * @returns Partial collection document
 */
export function createCollectionDocumentPayload(params: {
  currentMetersIn: string;
  currentMetersOut: string;
  currentCollectionTime: string;
  currentMachineNotes: string;
  currentRamClear: boolean;
  prevIn: number;
  prevOut: number;
  selectedMachineId: string;
  machineForDataEntry: {
    name: string;
    serialNumber: string;
  };
  userId: string;
  selectedLocationName: string;
  selectedLocationId: string | undefined;
}): Partial<CollectionDocument> {
  const metersIn = Number(params.currentMetersIn);
  const metersOut = Number(params.currentMetersOut);

  return {
    _id: '', // Will be set by the database
    machineId: params.selectedMachineId,
    machineName: params.machineForDataEntry.name,
    machineCustomName: params.selectedMachineId,
    serialNumber: params.machineForDataEntry.serialNumber,
    timestamp: params.currentCollectionTime
      ? new Date(params.currentCollectionTime)
      : new Date(),
    metersIn,
    metersOut,
    prevIn: params.prevIn || 0,
    prevOut: params.prevOut || 0,
    softMetersIn: metersIn,
    softMetersOut: metersOut,
    notes: params.currentMachineNotes,
    ramClear: params.currentRamClear,
    isCompleted: false,
    collector: params.userId,
    location: params.selectedLocationName,
    locationReportId: params.selectedLocationId || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
    sasMeters: {
      machine: params.machineForDataEntry.name,
      drop: 0,
      totalCancelledCredits: 0,
      gross: 0,
      gamesPlayed: 0,
      jackpot: 0,
      sasStartTime: '',
      sasEndTime: '',
    },
    movement: {
      metersIn,
      metersOut,
      gross: metersIn - metersOut,
    },
  };
}
