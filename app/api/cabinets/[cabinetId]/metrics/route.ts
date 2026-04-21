/**
 * Cabinet Metrics API Route
 *
 * This route handles fetching cabinet metrics by redirecting to the location-specific endpoint.
 * It supports:
 * - Finding cabinet location
 * - Preserving timePeriod query parameter
 * - Redirecting to location-specific metrics endpoint
 *
 * @module app/api/cabinets/[cabinetId]/metrics/route
 */

import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cabinets/[cabinetId]/metrics
 *
 * Resolves the cabinet's parent location and redirects to the location-specific
 * metrics endpoint. Called by the cabinet detail view to load performance data.
 *
 * URL params:
 * @param cabinetId {string} Required (path). The cabinet (machine) ID to resolve.
 *
 * Query params:
 * @param timePeriod {string} Optional. Time period filter forwarded to the location endpoint (e.g. "today", "week").
 * @param startDate  {string} Optional. ISO start date forwarded to the location endpoint.
 * @param endDate    {string} Optional. ISO end date forwarded to the location endpoint.
 */
export async function GET(
  request: NextRequest
) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/')[3];

  try {
    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get('timePeriod');

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find cabinet by ID
    // ============================================================================

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const cabinet = await Machine.findOne({ _id: cabinetId });
    if (!cabinet) {
      return NextResponse.json(
        { success: false, message: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Get cabinet location
    // ============================================================================
    const locationId = cabinet.gamingLocation;
    if (!locationId) {
      return NextResponse.json(
        { success: false, message: 'Cabinet has no associated location' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Build redirect URL with query parameters
    // ============================================================================
    const url = new URL(request.url);
    const newUrl = new URL(
      `/api/locations/${locationId}/cabinets/${cabinetId}/metrics`,
      url.origin
    );
    if (timePeriod) {
      newUrl.searchParams.set('timePeriod', timePeriod);
    }

    // ============================================================================
    // STEP 6: Redirect to location-specific endpoint
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Cabinet Metrics GET API] Redirected after ${duration}ms`);
    }
    return NextResponse.redirect(newUrl);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Cabinet Metrics API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

