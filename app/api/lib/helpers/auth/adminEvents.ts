/**
 * Admin Auth Events Helpers
 *
 * This module provides functions for fetching authentication events:
 * - Filtering events by action, success status, time range
 * - Searching events by email, IP address, or details
 * - Pagination support
 *
 * @module app/api/lib/helpers/adminAuthEvents
 */

import { ActivityLog } from '@/app/api/lib/models/activityLog';

type TimeRange = '1h' | '24h' | '7d' | '30d';

/**
 * Calculate start date based on time range
 *
 * @param timeRange - Time range string (1h, 24h, 7d, 30d)
 * @returns Start date for the time range
 */
function calculateStartDate(timeRange: TimeRange): Date {
  const now = new Date();
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '24h':
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

/**
 * Build query filters for authentication events
 *
 * @param timeRange - Time range for filtering
 * @param action - Optional action filter
 * @param success - Optional success status filter
 * @param search - Optional search term
 * @returns MongoDB query filter object
 */
function buildEventFilters(
  timeRange: TimeRange,
  action?: string | null,
  success?: string | null,
  search?: string | null
): Record<string, unknown> {
  const startDate = calculateStartDate(timeRange);
  const filters: Record<string, unknown> = {
    timestamp: { $gte: startDate },
  };

  if (action && action !== 'all') {
    if (action === 'token_refresh') {
      filters.action = {
        $in: ['token_refresh_success', 'token_refresh_failed'],
      };
    } else {
      filters.action = action;
    }
  }

  if (success && success !== 'all') {
    filters.success = success === 'true';
  }

  if (search) {
    filters.$or = [
      { email: { $regex: search, $options: 'i' } },
      { ipAddress: { $regex: search, $options: 'i' } },
      { details: { $regex: search, $options: 'i' } },
    ];
  }

  return filters;
}

/**
 * Fetch authentication events with filtering and pagination
 *
 * Flow:
 * 1. Build query filters from parameters
 * 2. Query ActivityLog with pagination
 * 3. Count total matching documents
 * 4. Return events and pagination info
 *
 * @param timeRange - Time range for filtering
 * @param action - Optional action filter
 * @param success - Optional success status filter
 * @param search - Optional search term
 * @param page - Page number (1-based)
 * @param limit - Items per page
 * @returns Object containing events array and pagination info
 */
export async function getAuthEvents(
  timeRange: TimeRange = '24h',
  action?: string | null,
  success?: string | null,
  search?: string | null,
  page: number = 1,
  limit: number = 50
): Promise<{
  events: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const filters = buildEventFilters(timeRange, action, success, search);

  // Query actual data using ActivityLog model
  const skip = (page - 1) * limit;

  const events = await ActivityLog.find(filters)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .select('-__v')
    .lean();

  const total = await ActivityLog.countDocuments(filters);

  return {
    events,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


