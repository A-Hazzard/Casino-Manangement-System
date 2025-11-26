/**
 * Plays Trends Analytics API Route
 *
 * This route handles fetching plays trends data over time.
 * It supports:
 * - Filtering by time period
 * - Optional filtering by licensee and location IDs
 * - Hourly or daily aggregation based on time period
 *
 * @module app/api/analytics/plays-trends/route
 */

import { getPlaysTrends } from '@/app/api/lib/helpers/trends';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { TimePeriod } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching plays trends
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch plays trends data
 * 4. Return plays trends
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
    // STEP 3: Fetch plays trends data
    // ============================================================================
    const playsTrends = await getPlaysTrends(
      db,
      timePeriod,
      licencee,
      locationIds
    );

    // ============================================================================
    // STEP 4: Return plays trends
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Plays Trends GET API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: playsTrends,
      timePeriod,
      locationIds: locationIds ? locationIds.split(',') : null,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch plays trends';
    console.error(
      `[Plays Trends Analytics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
