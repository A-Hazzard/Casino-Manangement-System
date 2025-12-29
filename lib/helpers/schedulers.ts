/**
 * Schedulers Helper Functions
 *
 * Provides helper functions for fetching scheduler data with various filtering options.
 * Schedulers manage collection schedules for collectors and locations.
 *
 * Features:
 * - Fetches all scheduler data with optional licensee filtering.
 * - Fetches schedulers with multiple filter options (licensee, location, collector, status, date range).
 * - Handles errors gracefully with empty array fallback.
 */

import type { SchedulerData } from '../types/api';
import axios from 'axios';

// ============================================================================
// Scheduler Data Fetching
// ============================================================================

/**
 * Fetches schedulers with filtering options
 * @param options Filter options
 * @returns Filtered scheduler data
 */
export async function fetchSchedulersWithFilters(options: {
  licencee?: string;
  location?: string;
  collector?: string;
  status?: string;
  dateRange?: { start: string; end: string };
}): Promise<SchedulerData[]> {
  try {
    const { licencee, location, collector, status, dateRange } = options;

    // Build query parameters
    const params = new URLSearchParams();
    if (licencee && licencee !== 'all') params.append('licencee', licencee);
    if (location && location !== 'all') params.append('location', location);
    if (collector && collector !== 'all') params.append('collector', collector);
    if (status) params.append('status', status);
    if (dateRange?.start) params.append('startDate', dateRange.start);
    if (dateRange?.end) params.append('endDate', dateRange.end);

    const url = `/api/schedulers${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const { data } = await axios.get(url);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching schedulers with filters:', error);
    return [];
  }
}
