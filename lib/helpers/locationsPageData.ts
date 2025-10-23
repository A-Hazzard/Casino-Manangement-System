import axios from "axios";
import type { AggregatedLocation } from "@/lib/types/location";

/**
 * Fetch locations data with filters and date range
 */
export async function fetchLocationsData(
  activeMetricsFilter: string,
  selectedLicencee: string,
  filterString: string,
  dateRangeForFetch?: { from: Date; to: Date }
): Promise<AggregatedLocation[]> {
  try {
    const params = new URLSearchParams();

    if (selectedLicencee) {
      params.append("licencee", selectedLicencee);
    }

    if (filterString) {
      params.append("filters", filterString);
    }

    if (activeMetricsFilter && activeMetricsFilter !== "All Time") {
      params.append("timePeriod", activeMetricsFilter);
    }

    if (dateRangeForFetch) {
      params.append("startDate", dateRangeForFetch.from.toISOString());
      params.append("endDate", dateRangeForFetch.to.toISOString());
    }

    const response = await axios.get(`/api/locations?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error(" Error fetching locations data:", error);
    return [];
  }
}

/**
 * Search all locations
 */
export async function searchAllLocations(
  searchTerm: string,
  selectedLicencee: string
): Promise<AggregatedLocation[]> {
  try {
    const params = new URLSearchParams();
    params.append("search", searchTerm);
    if (selectedLicencee) {
      params.append("licencee", selectedLicencee);
    }

    const response = await axios.get(
      `/api/locations/search-all?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error(" Error searching locations:", error);
    return [];
  }
}

/**
 * Fetch machine statistics
 */
export async function fetchMachineStats(): Promise<{
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
}> {
  try {
    const params = new URLSearchParams();
    params.append("licensee", "all"); // Get all machines

    const response = await axios.get(
      `/api/analytics/machines/stats?${params.toString()}`
    );
    const data = response.data;

    return {
      totalMachines: data.totalMachines || 0,
      onlineMachines: data.onlineMachines || 0,
      offlineMachines: data.offlineMachines || 0,
    };
  } catch (error) {
    console.error(" Error fetching machine stats:", error);
    return {
      totalMachines: 0,
      onlineMachines: 0,
      offlineMachines: 0,
    };
  }
}
