/**
 * Cabinet Refresh API Route
 *
 * This route handles refreshing cabinet data by redirecting to the location-specific endpoint.
 * It supports:
 * - Finding cabinet location
 * - Redirecting to location-specific refresh endpoint
 *
 * @module app/api/cabinets/[cabinetId]/refresh/route
 */

import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/cabinets/[cabinetId]/refresh
 *
 * Resolves the cabinet's parent location and redirects to the location-specific
 * refresh endpoint. Called to trigger a live data refresh for a single cabinet.
 *
 * URL params:
 * @param cabinetId {string} Required (path). The cabinet (machine) ID to refresh.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/cabinets/[cabinetId]/refresh';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/')[3];

  try {
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
      logRouteError(
        functionName,
        'GET',
        '/api/cabinets/[cabinetId]/refresh',
        `Not found: ${cabinetId}`,
        user
      );
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
      logRouteError(
        functionName,
        'GET',
        '/api/cabinets/[cabinetId]/refresh',
        'Cabinet has no associated location',
        user
      );
      return NextResponse.json(
        { success: false, message: 'Cabinet has no associated location' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Redirect to location-specific endpoint
    // ============================================================================
    const url = new URL(request.url);
    const newUrl = new URL(
      `/api/locations/${locationId}/cabinets/${cabinetId}/refresh`,
      url.origin
    );

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/cabinets/[cabinetId]/refresh',
      1,
      user,
      duration
    );
    return NextResponse.redirect(newUrl);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/cabinets/[cabinetId]/refresh',
      errorMessage,
      user
    );
    console.error(
      `[Cabinet Refresh API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
