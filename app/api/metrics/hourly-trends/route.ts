/**
 * Hourly Trends Metrics API Route
 */
import {
  getHourlyTrends,
  processMultipleLocationsHourlyData,
  processSingleLocationHourlyData,
} from '@/app/api/lib/helpers/trends/hourly';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { TimePeriod } from '@/app/api/lib/types';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/metrics/hourly-trends';
  const user = extractUserFromRequest(req);

  try {
    // ============================================================================
    // STEP 1: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const locationIds = searchParams.get('locationIds');
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!locationId && !locationIds) {
      logRouteError(
        functionName,
        'GET',
        '/api/metrics/hourly-trends',
        'Location ID or Location IDs are required',
        user
      );
      return NextResponse.json(
        { error: 'Location ID or Location IDs are required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      logRouteError(
        functionName,
        'GET',
        '/api/metrics/hourly-trends',
        'Database connection not established',
        user
      );
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Fetch hourly trends data
    // ============================================================================
    const {
      currentPeriodRevenue,
      previousPeriodAverage,
      hourlyData,
      targetLocations,
    } = await getHourlyTrends(
      locationId,
      locationIds,
      timePeriod,
      startDateParam,
      endDateParam,
      licencee
    );

    // ============================================================================
    // STEP 4: Process and return hourly trends data
    // ============================================================================
    if (locationIds) {
      const locationData = processMultipleLocationsHourlyData(
        hourlyData,
        targetLocations
      );
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/metrics/hourly-trends',
        targetLocations.length,
        user,
        duration
      );
      return NextResponse.json({
        locationIds: targetLocations,
        timePeriod,
        locationData,
        currentPeriodRevenue,
        previousPeriodAverage,
      });
    } else {
      const hourlyTrends = processSingleLocationHourlyData(hourlyData);
      const totalRevenue = hourlyTrends.reduce(
        (sum: number, item: { revenue: number }) => sum + item.revenue,
        0
      );
      const peakRevenue = Math.max(
        ...hourlyTrends.map((item: { revenue: number }) => item.revenue)
      );
      const avgRevenue = Math.round(totalRevenue / 24);
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/metrics/hourly-trends',
        1,
        user,
        duration
      );
      return NextResponse.json({
        locationId,
        timePeriod,
        hourlyTrends,
        currentPeriodRevenue,
        previousPeriodAverage,
        totalRevenue,
        peakRevenue,
        avgRevenue,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch hourly trends';
    logRouteError(
      functionName,
      'GET',
      '/api/metrics/hourly-trends',
      errorMessage,
      user
    );
    console.error(
      `[Hourly Trends Metrics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
