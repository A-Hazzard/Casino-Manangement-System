/**
 * Analytics Jackpot Trends API Route
 *
 * This route handles fetching jackpot trends data over time.
 * It supports:
 * - Time period filtering (Today, Yesterday, 7d, 30d, Custom)
 * - Licensee-based filtering
 * - Location-based filtering (comma-separated location IDs)
 * - Hourly or daily aggregation based on time period
 *
 * @module app/api/analytics/jackpot-trends/route
 */

import { getJackpotTrends } from '@/app/api/lib/helpers/trends';
import { connectDB } from '@/app/api/lib/middleware/db';
import { TimePeriod } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching jackpot trends data
 *
 * Flow:
 * 1. Parse and validate request parameters (timePeriod, licencee, locationIds)
 * 2. Connect to database
 * 3. Execute the core jackpot trends fetching logic via `getJackpotTrends` helper
 * 4. Return jackpot trends data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

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
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Execute the core jackpot trends fetching logic via helper
    // ============================================================================
    const jackpotTrends = await getJackpotTrends(
      db,
      timePeriod,
      licencee,
      locationIds
    );

    // ============================================================================
    // STEP 4: Return jackpot trends data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Jackpot Trends GET API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      data: jackpotTrends,
      timePeriod,
      locationIds: locationIds ? locationIds.split(',') : null,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Analytics Jackpot Trends GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to fetch jackpot trends' },
      { status: 500 }
    );
  }
}
