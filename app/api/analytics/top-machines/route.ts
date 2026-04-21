/**
 * Top Machines Analytics API Route
 *
 * This route handles fetching top performing machines for a specific location.
 * It supports:
 * - Filtering by location and time period
 * - Custom date range support
 * - Aggregating financial and gaming metrics
 * - Sorting by revenue (highest performers first)
 *
 * @module app/api/analytics/top-machines/route
 */

import { getTopMachinesByLocation } from '@/app/api/lib/helpers/reports/topMachines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/analytics/top-machines
 *
 * Returns the top-performing machines for a specific location sorted by revenue. Used by the location detail top machines widget.
 *
 * Query params:
 * @param locationId {string} Required. The location to fetch top machines for.
 * @param timePeriod {string} Optional. Time window descriptor. Defaults to '24h'.
 * @param startDate  {string} Optional. ISO datetime string for the start of a custom range.
 * @param endDate    {string} Optional. ISO datetime string for the end of a custom range.
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch top machines data
 * 4. Return top machines
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
    // STEP 3: Fetch top machines data
    // ============================================================================
    const topMachines = await getTopMachinesByLocation(
      locationId,
      timePeriod,
      startDate,
      endDate
    );

    // ============================================================================
    // STEP 4: Return top machines
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(
        `[Analytics Top Machines GET API] Completed in ${duration}ms`
      );
    }
    return NextResponse.json(topMachines);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch top machines data';
    console.error(
      `[Top Machines Analytics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
