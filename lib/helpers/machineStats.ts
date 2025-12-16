/**
 * Machine Statistics Helper Functions
 *
 * Provides helper functions for fetching and managing machine statistics,
 * including total, online, and offline machine counts. It supports licensee
 * filtering to get statistics for specific licensees or all licensees.
 *
 * Features:
 * - Fetches machine statistics (total, online, offline counts).
 * - Supports licensee filtering (defaults to "all").
 * - Handles errors gracefully with default values.
 * - Provides type definitions for machine statistics.
 * - Uses new dedicated machine status API that queries lastActivity.
 */

import axios from 'axios';

// ============================================================================
// Type Definitions
// ============================================================================

export type MachineStats = {
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
};

// ============================================================================
// Machine Statistics Fetching
// ============================================================================

/**
 * Fetches machine statistics for online/offline counts based on lastActivity
 * Uses the new dedicated /api/machines/status endpoint that properly filters
 * by user permissions and selected licensee.
 *
 * @param licensee - The licensee filter (defaults to "all")
 * @param locationId - Optional specific location ID to get stats for that location only
 * @param machineTypeFilter - Optional filter string (comma-separated) for SMIB/No SMIB/Local Server/Membership
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise resolving to machine stats
 */
export async function fetchMachineStats(
  licensee: string = 'all',
  locationId?: string,
  machineTypeFilter?: string | null,
  signal?: AbortSignal
): Promise<MachineStats> {
  try {
    const params = new URLSearchParams();
    if (licensee && licensee !== 'all') {
      params.append('licensee', licensee);
    }
    if (locationId) {
      params.append('locationId', locationId);
    }
    if (machineTypeFilter) {
      params.append('machineTypeFilter', machineTypeFilter);
    }

    const res = await axios.get(`/api/machines/status?${params.toString()}`, {
      signal,
    });
    const data = res.data;

    return {
      totalMachines: data.totalMachines || 0,
      onlineMachines: data.onlineMachines || 0,
      offlineMachines: data.offlineMachines || 0,
    };
  } catch (error) {
    // Check if this is a cancellation error (expected behavior, don't log or handle)
    // Let cancellation errors propagate to useAbortableRequest which handles them silently
    const isCanceled =
      axios.isCancel(error) ||
      (error instanceof Error &&
        (error.name === 'CanceledError' ||
          error.name === 'AbortError' ||
          error.message === 'canceled' ||
          error.message === 'The user aborted a request.')) ||
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED'));

    // Re-throw cancellation errors so useAbortableRequest can handle them silently
    if (isCanceled) {
      throw error;
    }

    // Only log non-cancellation errors
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching machine stats:', error);
    }

    // Return default values for non-cancellation errors
    return {
      totalMachines: 0,
      onlineMachines: 0,
      offlineMachines: 0,
    };
  }
}
