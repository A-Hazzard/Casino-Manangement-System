/**
 * Analytics Handle Trends API Route
 *
 * This route handles fetching handle (drop) trends data over time.
 * It supports:
 * - Time period filtering (Today, Yesterday, 7d, 30d, Custom)
 * - Licencee-based filtering
 * - Location-based filtering (comma-separated location IDs)
 * - Hourly or daily aggregation based on time period
 *
 * @module app/api/analytics/handle-trends/route
 */

import { getHandleTrends } from '@/app/api/lib/helpers/trends/general';
import { connectDB } from '@/app/api/lib/middleware/db';
import { TimePeriod } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/analytics/handle-trends
 *
 * Returns handle (drop) trend data aggregated hourly or daily over the requested period. Used by the Analytics trends charts.
 *
 * Query params:
 * @param timePeriod  {TimePeriod} Optional. 'Today'|'Yesterday'|'7d'|'30d'|'Custom'. Defaults to 'Today'.
 * @param licencee    {string}     Optional. Scopes results to this licencee.
 * @param locationIds {string}     Optional. Comma-separated location IDs to filter results.
 *
 * Flow:
 * 1. Parse and validate request parameters (timePeriod, licencee, locationIds)
 * 2. Connect to database
 * 3. Execute the core handle trends fetching logic via `getHandleTrends` helper
 * 4. Return handle trends data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/analytics/handle-trends';
  const user = extractUserFromRequest(req);

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const locationIds = searchParams.get('locationIds');

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      logRouteError(
        functionName,
        'GET',
        '/api/analytics/handle-trends',
        'Database connection not established',
        user
      );
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Execute the core handle trends fetching logic via helper
    // ============================================================================
    const handleTrends = await getHandleTrends(
      timePeriod,
      licencee,
      locationIds
    );

    // ============================================================================
    // STEP 4: Return handle trends data
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/analytics/handle-trends',
      Array.isArray(handleTrends) ? handleTrends.length : 1,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data: handleTrends,
      timePeriod,
      locationIds: locationIds ? locationIds.split(',') : null,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/analytics/handle-trends',
      errorMessage,
      user
    );
    console.error(
      `[Analytics Handle Trends GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to fetch handle trends' },
      { status: 500 }
    );
  }
}
