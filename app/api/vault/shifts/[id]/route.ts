/**
 * Shift Detail API Route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  getShiftById,
  transformShiftForResponse,
} from '@/app/api/lib/helpers/vault/shifts';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching shift details
 *
 * @param {string} id - REQUIRED (path). The ID of the shift to fetch.
 */
export async function GET(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const shiftId = pathname.split('/').pop();

  return withApiAuth(req, async () => {
    try {
      if (!shiftId)
        return NextResponse.json(
          { success: false, error: 'Shift ID is required' },
          { status: 400 }
        );

      const shift = await getShiftById(shiftId);
      if (!shift)
        return NextResponse.json(
          { success: false, error: 'Shift not found' },
          { status: 404 }
        );

      return NextResponse.json({
        success: true,
        data: { shift: transformShiftForResponse(shift) },
      });
    } catch (err: unknown) {
      console.error('[Shift Detail API] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
