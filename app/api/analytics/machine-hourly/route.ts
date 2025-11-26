/**
 * Analytics Machine Hourly API Route
 *
 * This route handles fetching hourly machine trend data.
 * It supports:
 * - Filtering by location IDs or machine IDs
 * - Time period filtering (Today, Yesterday, 7d, 30d, Custom)
 * - Licensee-based filtering
 * - Hourly aggregation of machine metrics
 * - Currency conversion for multi-licensee views
 * - 24-hour array format with stacked data by location
 *
 * @module app/api/analytics/machine-hourly/route
 */

import { getMachineHourlyData } from '@/app/api/lib/helpers/machineHourly';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { CurrencyCode } from '@/shared/types/currency';
import { TimePeriod } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching machine hourly data
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request parameters (locationIds, machineIds, timePeriod, licencee, startDate, endDate, currency)
 * 3. Execute the core machine hourly fetching logic via `getMachineHourlyData` helper
 * 4. Return machine hourly trends data
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
    const machineIds = searchParams.get('machineIds');
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    if (!locationIds && !machineIds) {
      return NextResponse.json(
        { error: 'Location IDs or Machine IDs are required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Execute the core machine hourly fetching logic via helper
    // ============================================================================
    const machineHourlyData = await getMachineHourlyData(
      db,
      locationIds,
      machineIds,
      timePeriod,
      licencee,
      startDateParam,
      endDateParam,
      displayCurrency
    );

    // ============================================================================
    // STEP 4: Return machine hourly trends data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Machine Hourly GET API] Completed in ${duration}ms`);
    }

    return NextResponse.json(machineHourlyData);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Analytics Machine Hourly GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Failed to fetch machine hourly data' },
      { status: 500 }
    );
  }
}
