/**
 * Analytics Machine Hourly API Route
 *
 * This route handles fetching hourly machine trend data.
 * It supports:
 * - Filtering by location IDs or machine IDs
 * - Time period filtering (Today, Yesterday, 7d, 30d, Custom)
 * - Licencee-based filtering
 * - Hourly aggregation of machine metrics
 * - Currency conversion for multi-licencee views
 * - 24-hour array format with stacked data by location
 *
 * @module app/api/analytics/machine-hourly/route
 */

import { getMachineHourlyData } from '@/app/api/lib/helpers/trends/machineHourly';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import type { CurrencyCode } from '@/shared/types/currency';
import { TimePeriod } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/analytics/machine-hourly
 *
 * Returns 24-hour stacked hourly machine metric data grouped by location. Used by the machine hourly analytics chart.
 *
 * Query params:
 * @param locationIds {string}        Optional. Comma-separated location IDs. At least one of locationIds or machineIds is required.
 * @param machineIds  {string}        Optional. Comma-separated machine IDs. At least one of locationIds or machineIds is required.
 * @param timePeriod  {TimePeriod}    Optional. 'Today'|'Yesterday'|'7d'|'30d'|'Custom'. Defaults to 'Today'.
 * @param licencee    {string}        Optional. Scopes results to this licencee.
 * @param startDate   {string}        Optional. ISO datetime string for the start of a custom range.
 * @param endDate     {string}        Optional. ISO datetime string for the end of a custom range.
 * @param currency    {CurrencyCode}  Optional. Display currency for converted values. Defaults to 'USD'.
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request parameters (locationIds, machineIds, timePeriod, licencee, startDate, endDate, currency)
 * 3. Execute the core machine hourly fetching logic via `getMachineHourlyData` helper
 * 4. Return machine hourly trends data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/analytics/machine-hourly';
  const user = extractUserFromRequest(req);

  return withApiAuth(req, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request parameters
      // ============================================================================
      const { searchParams } = new URL(req.url);
      const locationIds = searchParams.get('locationIds');
      const machineIds = searchParams.get('machineIds');
      const timePeriod =
        (searchParams.get('timePeriod') as TimePeriod) || 'Today';
      const licencee = searchParams.get('licencee');
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');
      const displayCurrency =
        (searchParams.get('currency') as CurrencyCode) || 'USD';

      if (!locationIds && !machineIds) {
        logRouteError(
          functionName,
          'GET',
          '/api/analytics/machine-hourly',
          'Location IDs or Machine IDs are required',
          user
        );
        return NextResponse.json(
          { error: 'Location IDs or Machine IDs are required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Execute the core machine hourly fetching logic via helper
      // ============================================================================
      const machineHourlyData = await getMachineHourlyData(
        locationIds,
        machineIds,
        timePeriod,
        licencee,
        startDateParam,
        endDateParam,
        displayCurrency
      );

      // ============================================================================
      // STEP 3: Return machine hourly trends data
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/analytics/machine-hourly',
        1,
        user,
        duration
      );

      if (duration > 1000) {
        console.warn(`[${functionName}] Slow response — ${duration}ms`);
      }

      return NextResponse.json(machineHourlyData);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Internal server error';
      logRouteError(
        functionName,
        'GET',
        '/api/analytics/machine-hourly',
        errorMessage,
        user
      );
      console.error(`[${functionName}] Error:`, errorMessage);
      return NextResponse.json(
        { error: 'Failed to fetch machine hourly data' },
        { status: 500 }
      );
    }
  });
}
