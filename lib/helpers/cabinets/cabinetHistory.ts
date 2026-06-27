/**
 * Cabinet Collection History Operations Helpers
 *
 * Handles updating machine collection history entries.
 *
 * Features:
 * - Update or create collection history entries for machines
 * - Supports add, update, and delete operations
 */

import axios from 'axios';

// ============================================================================
// Collection History Operations
// ============================================================================

/**
 * Update, create, or delete a collection history entry for a machine.
 */
export const updateMachineCollectionHistory = async (
  machineId: string,
  collectionHistoryEntry?: {
    _id?: string;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    timestamp: Date;
    locationReportId: string;
  },
  operation: 'add' | 'update' | 'delete' = 'add',
  entryId?: string
) => {
  try {
    const response = await axios.patch(
      `/api/cabinets/${machineId}/collection-history`,
      {
        operation,
        entry: collectionHistoryEntry,
        entryId,
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error updating collection history for machine ${machineId}:`,
      error
    );
    throw error;
  }
};
