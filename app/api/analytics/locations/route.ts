/**
 * Analytics Locations API Route
 *
 * This route handles fetching top performing locations analytics data.
 * It supports:
 * - Filtering by licencee
 * - Aggregating machine statistics per location
 * - Financial metrics calculation (drop, cancelled credits, gross)
 * - Currency conversion for multi-licencee views
 * - Top 5 locations by performance
 *
 * @module app/api/analytics/locations/route
 */

import { getTopLocationsAnalytics } from '@/app/api/lib/helpers/reports/analytics';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/analytics/locations
 *
 * Returns the top 5 performing locations ranked by financial metrics. Used by the Analytics dashboard locations widget.
 *
 * Query params:
 * @param licencee {string}        Required. Scopes results to this licencee.
 * @param currency {CurrencyCode}  Optional. Display currency for converted values. Defaults to 'USD'.
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request parameters (licencee, currency)
 * 3. Execute the core top locations fetching logic via `getTopLocationsAnalytics` helper
 * 4. Return top locations analytics data
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/analytics/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const licencee = searchParams.get('licencee');
      const displayCurrency =
        (searchParams.get('currency') as CurrencyCode) || 'USD';

      if (!licencee) {
        logRouteError(
          functionName,
          'GET',
          '/api/analytics/locations',
          'Licencee is required',
          user
        );
        return NextResponse.json(
          { message: 'Licencee is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Execute the core top locations fetching logic via helper
      // ============================================================================
      const locationsData = await getTopLocationsAnalytics(
        licencee,
        displayCurrency
      );

      // ============================================================================
      // STEP 3: Return top locations analytics data
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/analytics/locations',
        1,
        user,
        duration
      );

      if (duration > 1000) {
        console.warn(`[${functionName}] Slow response — ${duration}ms`);
      }

      return NextResponse.json(locationsData);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Internal server error';
      logRouteError(
        functionName,
        'GET',
        '/api/analytics/locations',
        errorMessage,
        user
      );
      console.error(`[${functionName}] Error:`, errorMessage);
      return NextResponse.json(
        {
          message: 'Failed to fetch location analytics',
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  });
}
