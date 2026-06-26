/**
 * Analytics Location Trends API Route
 *
 * This route handles fetching location trends data over time.
 * It supports:
 * - Filtering by location IDs
 * - Time period filtering (Today, Yesterday, 7d, 30d, Custom)
 * - Licencee-based filtering
 * - Gaming day offset calculations
 * - Hourly or daily aggregation based on time period
 * - Currency conversion for multi-licencee views
 *
 * @module app/api/analytics/location-trends/route
 */

import { getLocationTrends } from '@/app/api/lib/helpers/trends/locations';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { TimePeriod } from '@/shared/types';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/analytics/location-trends
 *
 * Returns financial and gaming trend data for one or more locations over time. Used by the location analytics trends page.
 *
 * Query params:
 * @param locationIds     {string}                                   Required. Comma-separated location IDs to include.
 * @param timePeriod      {TimePeriod}                               Optional. 'Today'|'Yesterday'|'7d'|'30d'|'Custom'. Defaults to 'Today'.
 * @param licencee        {string}                                   Optional. Scopes results to this licencee.
 * @param startDate       {string}                                   Optional. ISO datetime string for the start of a custom range.
 * @param endDate         {string}                                   Optional. ISO datetime string for the end of a custom range.
 * @param currency        {CurrencyCode}                             Optional. Display currency for converted values. Defaults to 'USD'.
 * @param granularity     {'hourly'|'daily'|'weekly'|'monthly'}      Optional. Aggregation granularity. Defaults to 'daily'.
 * @param status          {'Online'|'Offline'|'All'}                 Optional. Filters machines by online status.
 * @param gameType        {string}                                   Optional. Filters machines by game type.
 * @param search          {string}                                   Optional. Text search applied to machine/cabinet names.
 * @param includeArchived {string}                                   Optional. Pass 'true' to include archived machines.
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request parameters (locationIds, timePeriod, licencee, startDate, endDate, currency)
 * 3. Execute the core location trends fetching logic via `getLocationTrends` helper
 * 4. Return location trends data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/analytics/location-trends';
  const user = extractUserFromRequest(req);

  return withApiAuth(req, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request parameters
      // ============================================================================
      const { searchParams } = new URL(req.url);
      const locationIds = searchParams.get('locationIds');
      const timePeriod =
        (searchParams.get('timePeriod') as TimePeriod) || 'Today';
      const licencee = searchParams.get('licencee');
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');
      const displayCurrency =
        (searchParams.get('currency') as CurrencyCode) || 'USD';
      const granularity = searchParams.get('granularity') as
        | 'hourly'
        | 'minute'
        | 'daily'
        | 'weekly'
        | 'monthly';
      const status = searchParams.get('status') as
        | 'Online'
        | 'Offline'
        | 'All'
        | null;
      const gameType = searchParams.get('gameType');
      const searchTerm = searchParams.get('search');
      const includeArchived = searchParams.get('includeArchived') === 'true';

      if (!locationIds) {
        logRouteError(
          functionName,
          'GET',
          '/api/analytics/location-trends',
          'Location IDs are required',
          user
        );
        return NextResponse.json(
          { error: 'Location IDs are required' },
          { status: 400 }
        );
      }

      const effectiveGranularity = granularity || 'daily';

      // ============================================================================
      // STEP 2: Execute the core location trends fetching logic via helper
      // ============================================================================
      const trendsData = await getLocationTrends(
        locationIds,
        timePeriod,
        licencee,
        startDateParam,
        endDateParam,
        displayCurrency,
        effectiveGranularity,
        status,
        gameType,
        searchTerm || undefined,
        includeArchived
      );

      // ============================================================================
      // STEP 3: Return location trends data
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/analytics/location-trends',
        1,
        user,
        duration
      );

      if (duration > 1000) {
        console.warn(`[${functionName}] Slow response — ${duration}ms`);
      }

      return NextResponse.json(trendsData);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Internal server error';
      logRouteError(
        functionName,
        'GET',
        '/api/analytics/location-trends',
        errorMessage,
        user
      );
      console.error(`[${functionName}] Error:`, errorMessage);
      return NextResponse.json(
        { error: 'Failed to fetch location trends' },
        { status: 500 }
      );
    }
  });
}
