/**
 * Analytics Charts API Route
 *
 * This route handles fetching chart data for analytics visualization.
 * It supports:
 * - Filtering by licensee
 * - Time period filtering (last7days, last30days)
 * - Currency conversion for multi-licensee views
 * - Daily aggregation of financial metrics (drop, cancelled credits, gross)
 *
 * @module app/api/analytics/charts/route
 */

import { getChartsData } from '@/app/api/lib/helpers/reports/analytics';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching charts data
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request parameters (licensee, period, currency)
 * 3. Execute the core charts data fetching logic via `getChartsData` helper
 * 4. Return chart series data with currency information
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get('licensee');
    const period =
      (searchParams.get('period') as 'last7days' | 'last30days') ||
      'last30days';
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    if (!licensee) {
      return NextResponse.json(
        { message: 'Licensee is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Execute the core charts data fetching logic via helper
    // ============================================================================
    const chartsData = await getChartsData(licensee, period, displayCurrency);

    // ============================================================================
    // STEP 4: Return chart series data with currency information
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Charts GET API] Completed in ${duration}ms`);
    }

    return NextResponse.json(chartsData);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Analytics Charts GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        message: 'Failed to fetch chart data',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

