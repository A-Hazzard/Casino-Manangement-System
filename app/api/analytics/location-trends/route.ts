/**
 * Analytics Location Trends API Route
 *
 * This route handles fetching location trends data over time.
 * It supports:
 * - Filtering by location IDs
 * - Time period filtering (Today, Yesterday, 7d, 30d, Custom)
 * - Licensee-based filtering
 * - Gaming day offset calculations
 * - Hourly or daily aggregation based on time period
 * - Currency conversion for multi-licensee views
 *
 * @module app/api/analytics/location-trends/route
 */

import { getLocationTrends } from '@/app/api/lib/helpers/locationTrends';
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
      | null;

    if (!locationIds) {
      return NextResponse.json(
        { error: 'Location IDs are required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Execute the core location trends fetching logic via helper
    // ============================================================================
    const trendsData = await getLocationTrends(
      db,
      locationIds,
      timePeriod,
      licencee,
      startDateParam,
      endDateParam,
      displayCurrency,
      granularity || undefined
    );

    // ============================================================================
    // STEP 4: Return location trends data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(
        `[Analytics Location Trends GET API] Completed in ${duration}ms`
      );
    }

    return NextResponse.json(trendsData);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Analytics Location Trends GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to fetch location trends' },
      { status: 500 }
    );
  }
}
