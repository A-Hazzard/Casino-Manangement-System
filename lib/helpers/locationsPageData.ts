/**
 * Locations Page Data Helper Functions
 *
 * Provides helper functions for fetching locations page data, including location
 * lists with filters, search functionality, and machine statistics. It handles
 * data retrieval for the locations overview page.
 *
 * Features:
 * - Fetches locations data with filters, date range, and licensee filtering.
 * - Searches all locations by search term.
 * - Fetches machine statistics (total, online, offline counts).
 */

import type { AggregatedLocation } from '@/lib/types/location';
import axios from 'axios';

// ============================================================================
// Location Data Fetching
// ============================================================================

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
      params.append('licencee', selectedLicencee);
    }

    if (filterString) {
      params.append('filters', filterString);
    }

    if (activeMetricsFilter && activeMetricsFilter !== 'All Time') {
      params.append('timePeriod', activeMetricsFilter);
    }

    if (dateRangeForFetch) {
      params.append('startDate', dateRangeForFetch.from.toISOString());
      params.append('endDate', dateRangeForFetch.to.toISOString());
    }

    const response = await axios.get(`/api/locations?${params.toString()}`);
    return response.data;
  } catch (error) {
    // Check if this is a cancellation error (expected behavior, don't log)
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
    console.error(' Error fetching locations data:', error);
    return [];
  }
}

// ============================================================================
// Location Search
// ============================================================================

/**
 * Search all locations
 */
export async function searchAllLocations(
  searchTerm: string,
  selectedLicencee: string
): Promise<AggregatedLocation[]> {
  try {
    const params = new URLSearchParams();
    params.append('search', searchTerm);
    if (selectedLicencee) {
      params.append('licencee', selectedLicencee);
    }

    const response = await axios.get(
      `/api/locations/search-all?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    // Check if this is a cancellation error (expected behavior, don't log)
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
    console.error(' Error searching locations:', error);
    return [];
  }
}

// ============================================================================
// Machine Statistics
// ============================================================================

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
    params.append('licensee', 'all'); // Get all machines

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
    console.error(' Error fetching machine stats:', error);
    return {
      totalMachines: 0,
      onlineMachines: 0,
      offlineMachines: 0,
    };
  }
}
