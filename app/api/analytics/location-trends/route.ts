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
import { connectDB } from '@/app/api/lib/middleware/db';
import { TimePeriod } from '@/shared/types';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching location trends data
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request parameters (locationIds, timePeriod, licencee, startDate, endDate, currency)
 * 3. Execute the core location trends fetching logic via `getLocationTrends` helper
 * 4. Return location trends data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request parameters
    // Example: GET /api/analytics/location-trends?locationIds=6801f2a3b4c5d6e7f8901234,6802f3b4c5d6e7f890123456&licencee=9a5db2cb29ffd2d962fd1d91&currency=TTD&timePeriod=Yesterday&granularity=hourly
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const locationIds = searchParams.get('locationIds');
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = (searchParams.get('licencee'));
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';
    const granularity = searchParams.get('granularity') as  'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly';
    const status = searchParams.get('status') as 'Online' | 'Offline' | 'All' | null;
    const gameType = searchParams.get('gameType');
    const searchTerm = searchParams.get('search');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    console.log(`[Location Trends API] Request — locationIds: ${locationIds}, timePeriod: ${timePeriod}, startDate: ${startDateParam ?? 'none'}, endDate: ${endDateParam ?? 'none'}, granularity: ${granularity ?? 'auto'}, currency: ${displayCurrency}`);

    if (!locationIds) {
      return NextResponse.json(
        { error: 'Location IDs are required' },
        { status: 400 }
      );
    }

    const effectiveGranularity = granularity || 'daily';

    // ============================================================================
    // STEP 3: Execute the core location trends fetching logic via helper
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
    // STEP 4: Return location trends data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Location Trends API] Slow response — ${duration}ms`);
    } else {
      console.log(`[Location Trends API] Completed in ${duration}ms`);
    }

    return NextResponse.json(trendsData);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Location Trends API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to fetch location trends' },
      { status: 500 }
    );
  }
}
