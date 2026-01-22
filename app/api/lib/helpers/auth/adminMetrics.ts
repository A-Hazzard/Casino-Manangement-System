/**
 * Admin Auth Metrics Helpers
 *
 * This module provides functions for fetching authentication metrics:
 * - Total logins count
 * - Successful logins count
 * - Failed logins count
 * - Active sessions count
 * - Locked accounts count
 * - Suspicious activities count
 *
 * @module app/api/lib/helpers/adminAuthMetrics
 */

import { ActivityLog } from '@/app/api/lib/models/activityLog';
import User from '@/app/api/lib/models/user';

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
 * Fetch authentication metrics for admin dashboard
 *
 * Flow:
 * 1. Calculate date range based on timeRange parameter
 * 2. Query ActivityLog for various metrics:
 *    - Total logins (all actions)
 *    - Successful logins (create action on user resource)
 *    - Failed logins (update action with 'failed' in details)
 *    - Suspicious activities (keywords in details)
 *    - Active sessions (recent activity in last 30 minutes)
 * 3. Query User model for locked accounts
 * 4. Return aggregated metrics
 *
 * @param timeRange - Time range for metrics (1h, 24h, 7d, 30d)
 * @returns Object containing all authentication metrics
 */
export async function getAuthMetrics(timeRange: TimeRange = '24h'): Promise<{
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  activeSessions: number;
  lockedAccounts: number;
  suspiciousActivities: number;
}> {
  const startDate = calculateStartDate(timeRange);
  const now = new Date();

  // Query actual data using ActivityLog model
  const totalLogins = await ActivityLog.countDocuments({
    action: { $in: ['create', 'update', 'delete', 'view', 'download'] },
    timestamp: { $gte: startDate },
  });

  const successfulLogins = await ActivityLog.countDocuments({
    action: 'create',
    resource: 'user',
    timestamp: { $gte: startDate },
  });

  const failedLogins = await ActivityLog.countDocuments({
    action: 'update',
    resource: 'user',
    details: { $regex: 'failed', $options: 'i' },
    timestamp: { $gte: startDate },
  });

  const suspiciousActivities = await ActivityLog.countDocuments({
    details: { $regex: 'suspicious|security|breach', $options: 'i' },
    timestamp: { $gte: startDate },
  });

  // Get locked accounts count
  const lockedAccounts = await User.countDocuments({
    isLocked: true,
    lockedUntil: { $gt: now },
  });

  // Get active sessions count (approximate based on recent activity)
  const activeSessions = await ActivityLog.countDocuments({
    timestamp: { $gte: new Date(now.getTime() - 30 * 60 * 1000) }, // Last 30 minutes
  });

  return {
    totalLogins,
    successfulLogins,
    failedLogins,
    activeSessions,
    lockedAccounts,
    suspiciousActivities,
  };
}


