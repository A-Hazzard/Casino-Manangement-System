/**
 * Analytics Hourly Revenue API Route
 *
 * This route handles fetching hourly revenue data for a specific location.
 * It supports:
 * - Filtering by location ID
 * - Time period filtering (24h, 7d, 30d, Custom)
 * - Hourly aggregation of revenue, drop, and cancelled credits
 * - 24-hour array format with zeroes for missing hours
 *
 * @module app/api/analytics/hourly-revenue/route
 */

import { getHourlyRevenue } from '@/app/api/lib/helpers/trends';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching hourly revenue data
 *
 * Flow:
 * 1. Parse and validate request parameters (locationId, timePeriod, startDate, endDate)
 * 2. Connect to database
 * 3. Execute the core hourly revenue fetching logic via `getHourlyRevenue` helper
 * 4. Return hourly revenue data
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

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
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Execute the core hourly revenue fetching logic via helper
    // ============================================================================
    const hourlyRevenue = await getHourlyRevenue(
      db,
      locationId,
      timePeriod,
      startDate,
      endDate
    );

    // ============================================================================
    // STEP 4: Return hourly revenue data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Hourly Revenue GET API] Completed in ${duration}ms`);
    }

    return NextResponse.json(hourlyRevenue);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Analytics Hourly Revenue GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to fetch hourly revenue data' },
      { status: 500 }
    );
  }
}
