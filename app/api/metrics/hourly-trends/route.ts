/**
 * Hourly Trends Metrics API Route
 *
 * This route handles fetching hourly revenue trends for locations.
 * It supports:
 * - Single or multiple location IDs
 * - Filtering by time period or custom date range
 * - Optional filtering by licensee
 * - Current period revenue and previous period average
 *
 * @module app/api/metrics/hourly-trends/route
 */

import {
  getHourlyTrends,
  processMultipleLocationsHourlyData,
  processSingleLocationHourlyData,
} from '@/app/api/lib/helpers/trends/hourly';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { TimePeriod } from '@/app/api/lib/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching hourly trends
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch hourly trends data
 * 4. Process hourly data for single or multiple locations
 * 5. Return hourly trends
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
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
    // STEP 4: Process hourly data for single or multiple locations
    // ============================================================================
    if (locationIds) {
      const locationData = processMultipleLocationsHourlyData(
        hourlyData,
        targetLocations
      );

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[Metrics Hourly Trends GET API] Completed in ${duration}ms`);
      }
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
        (sum, item) => sum + item.revenue,
        0
      );
      const peakRevenue = Math.max(...hourlyTrends.map(item => item.revenue));
      const avgRevenue = Math.round(totalRevenue / 24);

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[Metrics Hourly Trends GET API] Completed in ${duration}ms`);
      }
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
    console.error(
      `[Hourly Trends Metrics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

