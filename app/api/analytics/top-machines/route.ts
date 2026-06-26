/**
 * Top Machines Analytics API Route
 *
 * This route handles fetching top performing machines for a specific location.
 * It supports:
 * - Filtering by location and time period
 * - Custom date range support
 * - Aggregating financial and gaming metrics
 * - Sorting by revenue (highest performers first)
 *
 * @module app/api/analytics/top-machines/route
 */

import { getTopMachinesByLocation } from '@/app/api/lib/helpers/reports/topMachines';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/analytics/top-machines
 *
 * Returns the top-performing machines for a specific location sorted by revenue. Used by the location detail top machines widget.
 *
 * Query params:
 * @param locationId {string} Required. The location to fetch top machines for.
 * @param timePeriod {string} Optional. Time window descriptor. Defaults to '24h'.
 * @param startDate  {string} Optional. ISO datetime string for the start of a custom range.
 * @param endDate    {string} Optional. ISO datetime string for the end of a custom range.
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch top machines data
 * 4. Return top machines
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/analytics/top-machines';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      const timePeriod = searchParams.get('timePeriod') || '24h';
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!locationId) {
        logRouteError(
          functionName,
          'GET',
          '/api/analytics/top-machines',
          'Location ID is required',
          user
        );
        return NextResponse.json(
          { error: 'Location ID is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Fetch top machines data
      // ============================================================================
      const topMachines = await getTopMachinesByLocation(
        locationId,
        timePeriod,
        startDate,
        endDate
      );

      // ============================================================================
      // STEP 3: Return top machines
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/analytics/top-machines',
        Array.isArray(topMachines) ? topMachines.length : 1,
        user,
        duration
      );

      if (duration > 1000) {
        console.warn(`[${functionName}] Slow response — ${duration}ms`);
      }

      return NextResponse.json(topMachines);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to fetch top machines data';
      logRouteError(
        functionName,
        'GET',
        '/api/analytics/top-machines',
        errorMessage,
        user
      );
      console.error(`[${functionName}] Error:`, errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}
