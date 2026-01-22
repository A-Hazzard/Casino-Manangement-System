/**
 * User Metrics Helper Functions
 *
 * This module contains helper functions for user metrics operations.
 * It handles fetching aggregated metrics for users.
 *
 * @module app/api/lib/helpers/userMetrics
 */

import { connectDB } from '@/app/api/lib/middleware/db';

/**
 * Timeframe key mapping
 */
const timeframeKeyMap: Record<string, string> = {
  '7d': 'last7Days',
  '30d': 'last30Days',
  Today: 'Today',
  Yesterday: 'Yesterday',
};

/**
 * Validates time period parameter
 *
 * @param timePeriod - Time period string
 * @returns Validation error message or null if valid
 */
export function validateTimePeriod(timePeriod: string | null): string | null {
  if (!timePeriod) {
    return 'Missing timePeriod parameter';
  }

  if (!timeframeKeyMap[timePeriod]) {
    return `Invalid timePeriod parameter. Expected one of: ${Object.keys(
      timeframeKeyMap
    ).join(', ')}`;
  }

  return null;
}

/**
 * Fetches user metrics from casinoMetrics collection
 *
 * @param userId - User ID string
 * @returns User metrics object or null if not found
 */
export async function getUserMetrics(userId: string): Promise<unknown | null> {
  const db = await connectDB();
  if (!db) {
    throw new Error('Database connection failed');
  }

  const metricsForLocations = await db
    .collection('casinoMetrics')
    .findOne(
      { userId },
      { projection: { _id: 0, userId: 0, lastUpdated: 0 } }
    );

  return metricsForLocations || null;
}


