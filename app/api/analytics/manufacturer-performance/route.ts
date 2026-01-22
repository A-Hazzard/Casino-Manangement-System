/**
 * Manufacturer Performance Analytics API Route
 *
 * This route handles fetching manufacturer performance data for a specific location.
 * It supports:
 * - Filtering by location and time period
 * - Custom date range support
 * - Optional filtering by licensee
 * - Aggregating metrics by manufacturer
 * - Calculating percentages for each manufacturer
 *
 * @module app/api/analytics/manufacturer-performance/route
 */

import { getManufacturerPerformance } from '@/app/api/lib/helpers/reports/manufacturerPerformance';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { TimePeriod } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching manufacturer performance
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch manufacturer performance data
 * 4. Return manufacturer performance
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const licencee = searchParams.get('licencee');

    if (!locationId || locationId === 'all') {
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
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Fetch manufacturer performance data
    // ============================================================================
    const result = await getManufacturerPerformance(
      locationId,
      timePeriod,
      startDate,
      endDate,
      licencee
    );

    // ============================================================================
    // STEP 4: Return manufacturer performance
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(
        `[Analytics Manufacturer Performance GET API] Completed in ${duration}ms`
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch manufacturer performance data';
    console.error(
      `[Manufacturer Performance Analytics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
