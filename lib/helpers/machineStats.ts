/**
 * Machine stats helper functions for fetching and managing machine statistics
 */

import axios from "axios";

export type MachineStats = {
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
};

/**
 * Fetches machine statistics for online/offline counts
 * @param licensee - The licensee filter (defaults to "all")
 * @returns Promise resolving to machine stats
 */
export async function fetchMachineStats(licensee: string = "all"): Promise<MachineStats> {
  try {
    const params = new URLSearchParams();
    params.append("licensee", licensee);

    const res = await axios.get(
      `/api/analytics/machines/stats?${params.toString()}`
    );
    const data = res.data;
    
    return {
      totalMachines: data.totalMachines || 0,
      onlineMachines: data.onlineMachines || 0,
      offlineMachines: data.offlineMachines || 0,
    };
  } catch (error) {
    // Error handling for machine stats fetch
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching machine stats:", error);
    }
    return {
      totalMachines: 0,
      onlineMachines: 0,
      offlineMachines: 0,
    };
  }
}
