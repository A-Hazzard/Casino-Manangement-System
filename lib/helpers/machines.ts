/**
 * Machines Helper Functions
 *
 * Provides helper functions for fetching machine statistics, including online,
 * offline, and total machine counts. It supports optional licensee filtering
 * to get statistics for specific licensees.
 *
 * Features:
 * - Fetches machine statistics (online, offline, total counts).
 * - Supports optional licensee filtering.
 * - Handles errors gracefully with default values.
 */

import axios from 'axios';

// ============================================================================
// Machine Statistics
// ============================================================================

type MachineStats = {
  onlineMachines: number;
  totalMachines: number;
  offlineMachines: number;
};

/**
 * Fetches machine statistics (online/offline/total).
 * @param licencee - (Optional) Licencee ID to filter stats.
 * @returns Promise resolving to an object with machine stats.
 */
export async function fetchMachineStats(
  licencee?: string
): Promise<MachineStats> {
  try {
    let url = `/api/analytics/machines/stats`;
    if (licencee) {
      url += `?licensee=${licencee}`;
    }

    const response = await axios.get(url);

    if (!response.data || !response.data.stats) {
      console.error('No stats data returned from API');
      return { onlineMachines: 0, totalMachines: 0, offlineMachines: 0 };
    }

    const { onlineMachines, totalMachines } = response.data.stats;
    return {
      onlineMachines: onlineMachines || 0,
      totalMachines: totalMachines || 0,
      offlineMachines: (totalMachines || 0) - (onlineMachines || 0),
    };
  } catch (error) {
    console.error('Error fetching machine stats:', error);
    return { onlineMachines: 0, totalMachines: 0, offlineMachines: 0 };
  }
}
