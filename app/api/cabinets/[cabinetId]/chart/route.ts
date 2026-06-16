/**
 * Machine Chart Data API Route
 *
 * This route handles fetching chart data for a single machine.
 * It supports:
 * - Time period filtering (today, week, month, custom dates)
 * - Currency conversion
 * - Gaming day offset calculations
 * - Hourly or daily aggregation based on time period
 *
 * @module app/api/cabinets/[cabinetId]/chart/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import {
  calculateChartDateRange,
  detectChartDataSpan,
  resolveChartGranularity,
  buildChartAggregationPipeline,
  resolveChartNativeCurrency,
  convertChartBuckets,
  transformChartBuckets,
  type ChartBucket,
  type DataSpanResult,
} from '@/app/api/lib/helpers/cabinets/chartOperations';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import type { CurrencyCode } from '@/shared/types/currency';
import type { GamingMachine } from '@shared/types';
import type { LocationDocument } from '@/lib/types/common';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cabinets/[cabinetId]/chart
 *
 * Returns time-series chart data (drop, totalCancelledCredits, gross) for a single
 * machine aggregated at the appropriate granularity.
 *
 * URL params:
 * @param {string} machineId - Required (path).
 *
 * Query params:
 * @param {string} [timePeriod] - 'Today', 'Yesterday', '7d', '30d', 'Quarterly', 'All Time', 'Custom'
 * @param {string} [startDate] - ISO 8601 for custom range
 * @param {string} [endDate] - ISO 8601 for custom range
 * @param {CurrencyCode} [currency] - Target display currency (default: 'USD')
 * @param {'minute'|'hourly'|'daily'|'weekly'|'monthly'} [granularity] - Manual override
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database and fetch machine
 * 3. Check user access to machine's location
 * 4. Fetch location and resolve gameDayOffset
 * 5. Calculate gaming day date range
 * 6. Detect actual data span (Quarterly / All Time)
 * 7. Resolve aggregation granularity
 * 8. Build and execute aggregation pipeline
 * 9. Apply currency conversion
 * 10. Transform and return chart data
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const machineId = pathname.split('/')[3];
  const functionName = 'GET /api/cabinets/[cabinetId]/chart';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Parse and validate query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get('timePeriod');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const dateField = searchParams.get('dateField') || 'readAt';
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';
    const granularity = searchParams.get('granularity') as
      | 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
      | null;

    if (!timePeriod && !startDateParam && !endDateParam) {
      logRouteError(functionName, 'GET', '/api/cabinets/[cabinetId]/chart',
        'timePeriod or startDate/endDate parameters are required', user);
      return NextResponse.json(
        { error: 'timePeriod or startDate/endDate parameters are required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database and fetch machine
    // ============================================================================
    await connectDB();

    const machine = await Machine.findOne({ _id: machineId }).lean<GamingMachine | null>();
    if (!machine) {
      logRouteError(functionName, 'GET', '/api/cabinets/[cabinetId]/chart',
        `Not found: ${machineId}`, user);
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 3: Check user access to machine's location
    // ============================================================================
    if (machine.gamingLocation) {
      const hasAccess = await checkUserLocationAccess(String(machine.gamingLocation));
      if (!hasAccess) {
        console.warn(`[Cabinet Chart] Access denied — machine: ${machineId}`);
        return NextResponse.json(
          { success: false, error: 'Unauthorized: You do not have access to this machine' },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 4: Fetch location and resolve gameDayOffset
    // ============================================================================
    let gameDayOffset = 8;
    if (machine.gamingLocation) {
      try {
        const location = await GamingLocations.findOne({ _id: machine.gamingLocation })
          .select('gameDayOffset rel country')
          .lean<LocationDocument>();

        if (location) {
          gameDayOffset = location.gameDayOffset ?? 8;
        }
      } catch (error) {
        console.warn('[Cabinet Chart] Failed to fetch location for gameDayOffset:', error);
      }
    }

    // ============================================================================
    // STEP 5: Calculate gaming day date range
    // ============================================================================
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const dateRangeResult = calculateChartDateRange(
      timePeriod, startDateParam, endDateParam, gameDayOffset
    );

    if ('error' in dateRangeResult) {
      return NextResponse.json(
        { success: false, error: dateRangeResult.error },
        { status: 400 }
      );
    }

    startDate = dateRangeResult.startDate;
    endDate = dateRangeResult.endDate;

    // ============================================================================
    // STEP 6: Detect actual data span (Quarterly / All Time)
    // ============================================================================
    let actualDataSpan: DataSpanResult = null;

    const dataSpanResult = await detectChartDataSpan(
      machineId, startDate, endDate, timePeriod
    );

    actualDataSpan = dataSpanResult.span;
    startDate = dataSpanResult.adjustedStartDate;
    endDate = dataSpanResult.adjustedEndDate;

    // ============================================================================
    // STEP 7: Resolve aggregation granularity
    // ============================================================================
    const granularityConfig = resolveChartGranularity(
      timePeriod, startDate, endDate, granularity
    );

    console.log(
      `[Cabinet Chart] Granularity resolved — ${granularity ? `manual: ${granularity}` : `auto: ${granularityConfig.resolvedGranularity}`}, ` +
      `query window: ${startDate?.toISOString() ?? 'all'} → ${endDate?.toISOString() ?? 'all'}`
    );

    // ============================================================================
    // STEP 8: Build and execute aggregation pipeline
    // ============================================================================
    const pipeline = buildChartAggregationPipeline(
      machineId, startDate, endDate, granularityConfig, dateField
    );

    const chartData = (await Meters.aggregate(pipeline)) as ChartBucket[];
    console.log(`[Cabinet Chart] Meters aggregation returned ${chartData.length} bucket(s)`);

    // ============================================================================
    // STEP 9: Apply currency conversion
    // ============================================================================
    let convertedChartData = chartData;

    if (displayCurrency) {
      const nativeCurrency = await resolveChartNativeCurrency(machine.gamingLocation);
      convertedChartData = convertChartBuckets(chartData, nativeCurrency, displayCurrency);
    }

    // ============================================================================
    // STEP 10: Transform and return chart data
    // ============================================================================
    const transformedData = transformChartBuckets(convertedChartData);

    const duration = Date.now() - startTime;
    logRouteFetch(functionName, 'GET', '/api/cabinets/[cabinetId]/chart',
      transformedData.length, user, duration);

    return NextResponse.json({
      success: true,
      data: transformedData,
      dataSpan:
        actualDataSpan && actualDataSpan.minDate && actualDataSpan.maxDate
          ? {
              minDate: actualDataSpan.minDate.toISOString(),
              maxDate: actualDataSpan.maxDate.toISOString(),
            }
          : undefined,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch machine chart data';
    logRouteError(functionName, 'GET', '/api/cabinets/[cabinetId]/chart',
      errorMessage, user);
    console.error(`[Cabinet Chart] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
