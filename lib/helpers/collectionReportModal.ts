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

import type { CollectionReportMachineSummary } from '@/lib/types/api';
import { validateRamClearMeters } from '@/lib/utils/ramClearValidation';

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
