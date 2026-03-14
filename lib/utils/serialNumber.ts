/**
 * Serial Number Utilities
 *
 * Utility functions for extracting serial number identifiers from cabinet objects.
 *
 * Features:
 * - Fallback order: serialNumber -> custom.name -> machineId
 * - Handles missing or empty values gracefully
 * - Returns "N/A" if no identifier is available
 */

import type { Types } from 'mongoose';

// ============================================================================
// Serial Number Extraction
// ============================================================================
/**
 * Gets the best available serial number identifier from a cabinet object.
 * Uses fallback order: serialNumber -> custom.name -> machineId.
 *
 * @param cabinet - Cabinet object with potential serial number fields.
 * @returns The best available serial number identifier, or "N/A" if none found.
 */
export function getSerialNumberIdentifier(cabinet: {
  serialNumber?: string;
  custom?: { name?: string };
  machineId?: string;
  _id?: string | Types.ObjectId;
}): string {
  // Primary: serialNumber
  if (cabinet.serialNumber && cabinet.serialNumber.trim() !== '') {
    return cabinet.serialNumber;
  }

  // Fallback 1: custom.name
  if (cabinet.custom?.name && cabinet.custom.name.trim() !== '') {
    return cabinet.custom.name;
  }

  // Fallback 2: machineId
  if (cabinet.machineId && cabinet.machineId.trim() !== '') {
    return cabinet.machineId;
  }

  // Fallback 3: _id (Direct ID from API response)
  const idStr = cabinet._id ? String(cabinet._id) : '';
  if (idStr.trim() !== '') {
    return idStr;
  }

  // Final fallback: "N/A"
  return 'N/A';
}

