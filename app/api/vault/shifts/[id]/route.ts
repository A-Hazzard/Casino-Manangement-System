/**
 * Shift Detail API Route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  getShiftById,
  transformShiftForResponse,
} from '@/app/api/lib/helpers/vault/shifts';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching shift details
 *
 * @param {string} id - REQUIRED (path). The ID of the shift to fetch.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/shifts/[id]';
  const user = extractUserFromRequest(req);

  const { pathname } = req.nextUrl;
  const shiftId = pathname.split('/').pop();

  return withApiAuth(req, async () => {
    try {
      if (!shiftId) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/shifts/[id]',
          'Shift ID is required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Shift ID is required' },
          { status: 400 }
        );
      }

      const shift = await getShiftById(shiftId);
      if (!shift) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/shifts/[id]',
          'Shift not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Shift not found' },
          { status: 404 }
        );
      }

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/shifts/[id]',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        data: { shift: transformShiftForResponse(shift) },
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch shift';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/shifts/[id]',
        errorMessage,
        user
      );
      console.error('[Shift Detail API] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
