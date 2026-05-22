/**
 * GET /api/locations/[locationId]/no-smib-check
 *
 * Lightweight endpoint that returns whether a gaming location is flagged as no-SMIB.
 * Used by the collection report modals to short-circuit the variation check flow
 * (no-SMIB locations should never trigger /api/collection-reports/check-variations).
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/app/api/lib/utils/apiResponse';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'GET /api/locations/[locationId]/no-smib-check';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to database and parse params
    // ============================================================================
    await connectDB();
    const { locationId } = await params;

    if (!locationId) {
      logRouteError(
        functionName,
        'GET',
        '/api/locations/[locationId]/no-smib-check',
        'locationId is required',
        user
      );
      return createErrorResponse(
        'locationId is required',
        400,
        'INVALID_REQUEST'
      );
    }

    const location = await GamingLocations.findOne(
      { _id: locationId },
      { _id: 1, noSMIBLocation: 1 }
    ).lean<{ _id: string; noSMIBLocation?: boolean }>();

    if (!location) {
      logRouteError(
        functionName,
        'GET',
        '/api/locations/[locationId]/no-smib-check',
        'Location not found',
        user
      );
      return createErrorResponse('Location not found', 404, 'NOT_FOUND');
    }

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/locations/[locationId]/no-smib-check',
      1,
      user,
      duration
    );

    return createSuccessResponse(
      { noSMIBLocation: Boolean(location.noSMIBLocation) },
      'No-SMIB check completed'
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to check no-SMIB flag';
    logRouteError(
      functionName,
      'GET',
      '/api/locations/[locationId]/no-smib-check',
      errorMessage,
      user
    );
    console.error('[API] no-smib-check error:', error);
    return createErrorResponse(
      'Failed to check no-SMIB flag',
      500,
      'NO_SMIB_CHECK_ERROR',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
