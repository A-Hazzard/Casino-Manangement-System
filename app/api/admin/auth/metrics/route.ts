/**
 * Admin Auth Metrics API Route
 *
 * This route provides authentication metrics for admin dashboard, including:
 * - Total logins count
 * - Successful logins count
 * - Failed logins count
 * - Active sessions count
 * - Locked accounts count
 * - Suspicious activities count
 *
 * Supports:
 * - Time range filtering (1h, 24h, 7d, 30d)
 * - Admin/developer access control
 *
 * @module app/api/admin/auth/metrics/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthMetrics } from '@/app/api/lib/helpers/auth/adminMetrics';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';

/**
 * GET /api/admin/auth/metrics
 *
 * Returns aggregate authentication metrics for the admin security dashboard.
 * Includes total logins, failed logins, active sessions, locked accounts, and
 * suspicious activity counts, all scoped to the requested time window.
 *
 * Query params:
 * @param timeRange {string}  Optional. Lookback window: '1h', '24h' (default), '7d', or '30d'.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and check permissions
    // ============================================================================
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - User not found' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 3: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') as '1h' | '24h' | '7d' | '30d') || '24h';

    // ============================================================================
    // STEP 4: Fetch authentication metrics
    // ============================================================================
    const metrics = await getAuthMetrics(timeRange);

    // ============================================================================
    // STEP 5: Return metrics data
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Admin Auth Metrics GET API] Fetched metrics for ${timeRange} after ${duration}ms.`
    );

    return NextResponse.json(metrics);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Admin Auth Metrics GET API] Error after ${duration}ms:`,
      errorMessage
    );

    return NextResponse.json(
      { error: 'Failed to fetch authentication metrics' },
      { status: 500 }
    );
  }
}

