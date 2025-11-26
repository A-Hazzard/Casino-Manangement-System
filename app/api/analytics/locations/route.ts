/**
 * Analytics Locations API Route
 *
 * This route handles fetching top performing locations analytics data.
 * It supports:
 * - Filtering by licensee
 * - Aggregating machine statistics per location
 * - Financial metrics calculation (drop, cancelled credits, gross)
 * - Currency conversion for multi-licensee views
 * - Top 5 locations by performance
 *
 * @module app/api/analytics/locations/route
 */

import { getTopLocationsAnalytics } from '@/app/api/lib/helpers/analytics';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching top locations analytics
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request parameters (licensee, currency)
 * 3. Execute the core top locations fetching logic via `getTopLocationsAnalytics` helper
 * 4. Return top locations analytics data
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get('licensee');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    if (!licensee) {
      return NextResponse.json(
        { message: 'Licensee is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Execute the core top locations fetching logic via helper
    // ============================================================================
    const locationsData = await getTopLocationsAnalytics(
      db,
      licensee,
      displayCurrency
    );

    // ============================================================================
    // STEP 4: Return top locations analytics data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Locations GET API] Completed in ${duration}ms`);
    }

    return NextResponse.json(locationsData);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Analytics Locations GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        message: 'Failed to fetch location analytics',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
