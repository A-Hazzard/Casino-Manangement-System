/**
 * Top Performing Metrics API Route
 *
 * This route handles fetching top performing locations or cabinets based on moneyIn (drop).
 * It supports:
 * - Filtering by activeTab (locations or cabinets)
 * - Filtering by timePeriod (Today, Yesterday, 7d, 30d)
 * - Optional filtering by licensee
 *
 * @module app/api/metrics/top-performing/route
 */

import { getTopPerformingMetrics } from '@/app/api/lib/helpers/top-performing';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { TimePeriod } from '@/app/api/lib/types';
import { NextRequest, NextResponse } from 'next/server';

type ActiveTab = 'locations' | 'Cabinets';

/**
 * Main GET handler for fetching top performing metrics
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch top performing metrics
 * 4. Return top performing data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const searchParams = req.nextUrl.searchParams;
    const activeTab =
      (searchParams.get('activeTab') as ActiveTab) || 'locations';
    const timePeriod: TimePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || '7d';
    const licensee =
      searchParams.get('licensee') || searchParams.get('licencee');

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
    // STEP 3: Fetch top performing metrics
    // ============================================================================
    const data = await getTopPerformingMetrics(
      db,
      activeTab,
      timePeriod,
      licensee || undefined
    );

    // ============================================================================
    // STEP 4: Return top performing data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Top Performing API] Completed in ${duration}ms`);
    }
    return NextResponse.json({ activeTab, timePeriod, data });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';
    console.error(
      `[Top Performing Metrics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
