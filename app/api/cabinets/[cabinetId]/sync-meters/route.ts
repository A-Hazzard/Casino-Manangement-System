/**
 * Cabinet Sync Meters API Route
 *
 * This route handles syncing meters for a cabinet by redirecting to the location-specific endpoint.
 * It supports:
 * - Finding cabinet location
 * - Redirecting to location-specific sync-meters endpoint
 *
 * @module app/api/cabinets/[cabinetId]/sync-meters/route
 */

import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/cabinets/[cabinetId]/sync-meters
 *
 * Resolves the cabinet's parent location and redirects to the location-specific
 * sync-meters endpoint. Called to force a meter synchronisation for a single cabinet.
 *
 * URL params:
 * @param cabinetId {string} Required (path). The cabinet (machine) ID whose meters to sync.
 *
 * Body fields:
 * (none — body is forwarded transparently to the location-specific endpoint via redirect)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/cabinets/[cabinetId]/sync-meters';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const cabinetId = pathname.split('/')[3];

  try {
    await connectDB();

    // ============================================================================
    // STEP 3: Find cabinet by ID
    // ============================================================================

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const cabinet = await Machine.findOne({ _id: cabinetId });
    if (!cabinet) {
      logRouteError(
        functionName,
        'POST',
        '/api/cabinets/[cabinetId]/sync-meters',
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
        'POST',
        '/api/cabinets/[cabinetId]/sync-meters',
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
      `/api/locations/${locationId}/cabinets/${cabinetId}/sync-meters`,
      url.origin
    );

    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/cabinets/[cabinetId]/sync-meters',
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
      'POST',
      '/api/cabinets/[cabinetId]/sync-meters',
      errorMessage,
      user
    );
    console.error(
      `[Cabinet Sync Meters API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
