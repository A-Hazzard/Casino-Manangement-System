/**
 * Schedulers Helper Functions
 *
 * Provides helper functions for fetching, editing, and soft-deleting scheduler records.
 * Schedulers manage collection schedules for collectors and locations.
 *
 * Features:
 * - Fetches scheduler data with filtering options.
 * - Edit a schedule's startTime, endTime, or status.
 * - Soft-delete a schedule (sets deletedAt on the server).
 * - Handles errors gracefully with fallback values.
 */

import type { SchedulerData } from '../types/api';
import axios from 'axios';

// ============================================================================
// Scheduler Mutations
// ============================================================================

/**
 * Edits a scheduler's startTime, endTime, and/or status.
 * Allowed roles: manager, admin, location admin, owner, developer.
 */
export async function editScheduler(
  schedulerId: string,
  data: { startTime?: string; endTime?: string; status?: string }
): Promise<boolean> {
  try {
    await axios.patch(`/api/schedulers/${schedulerId}`, data);
    return true;
  } catch (error) {
    console.error('Error editing scheduler:', error);
    return false;
  }
}

/**
 * Soft-deletes a scheduler (sets deletedAt on the server).
 * Allowed roles: manager, admin, location admin, owner, developer.
 */
export async function deleteScheduler(schedulerId: string): Promise<boolean> {
  try {
    await axios.delete(`/api/schedulers/${schedulerId}`);
    return true;
  } catch (error) {
    console.error('Error deleting scheduler:', error);
    return false;
  }
}

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

