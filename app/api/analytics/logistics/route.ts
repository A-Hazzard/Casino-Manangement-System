/**
 * Logistics Analytics API Route
 *
 * This route handles fetching logistics data from movement requests.
 * It supports:
 * - Filtering by search term (cabinet, location, moved by)
 * - Filtering by status
 * - Transforming movement request data to logistics entry format
 *
 * @module app/api/analytics/logistics/route
 */

import { getLogisticsData } from '@/app/api/lib/helpers/logistics';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching logistics data
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch logistics data
 * 4. Return logistics data
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('searchTerm');
    const statusFilter = searchParams.get('statusFilter');

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Fetch logistics data
    // ============================================================================
    const responseData = await getLogisticsData(searchTerm, statusFilter);

    // ============================================================================
    // STEP 4: Return logistics data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Logistics GET API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Logistics data fetched successfully',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(
      `[Logistics Analytics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch logistics data',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
