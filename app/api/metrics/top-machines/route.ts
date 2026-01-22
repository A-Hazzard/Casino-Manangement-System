/**
 * Top Machines Metrics API Route
 *
 * This route handles fetching top performing machines with detailed metrics.
 * It supports:
 * - Filtering by time period
 * - Optional filtering by licensee and location IDs
 * - Aggregating financial and gaming metrics
 * - Sorting by handle (highest performers first)
 *
 * @module app/api/metrics/top-machines/route
 */

import { getTopMachinesDetailed } from '@/app/api/lib/helpers/reports/topMachines';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { TimePeriod } from '@/app/api/lib/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching top machines with detailed metrics
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch top machines data
 * 4. Return top machines
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
    const limit = parseInt(searchParams.get('limit') || '5');

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
    // STEP 3: Fetch top machines data
    // ============================================================================
    const topMachines = await getTopMachinesDetailed(
      timePeriod,
      licencee,
      locationIds,
      limit
    );

    // ============================================================================
    // STEP 4: Return top machines
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Top Machines API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: topMachines,
      timePeriod,
      locationIds: locationIds ? locationIds.split(',') : null,
      limit,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch top machines';
    console.error(
      `[Top Machines Metrics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

