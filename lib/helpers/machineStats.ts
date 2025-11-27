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
 * @returns Promise resolving to machine stats
 */
export async function fetchMachineStats(
  licensee: string = 'all',
  locationId?: string
): Promise<MachineStats> {
  try {
    const params = new URLSearchParams();
    if (licensee && licensee !== 'all') {
      params.append('licensee', licensee);
    }
    if (locationId) {
      params.append('locationId', locationId);
    }

    const res = await axios.get(
      `/api/machines/status?${params.toString()}`
    );
    const data = res.data;

    return {
      totalMachines: data.totalMachines || 0,
      onlineMachines: data.onlineMachines || 0,
      offlineMachines: data.offlineMachines || 0,
    };
  } catch (error) {
    // Error handling for machine stats fetch
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching machine stats:', error);
    }
    return {
      totalMachines: 0,
      onlineMachines: 0,
      offlineMachines: 0,
    };
  }
}
