/**
 * Collection Report V2 — Custom System Meters Calculation API
 *
 * GET /api/collection-reports-v2/custom-meters
 * Calculates system meters for a custom collection period by summing drop
 * and totalCancelledCredits outside the movement object in the Meters collection.
 *
 * @module app/api/collection-reports-v2/custom-meters/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Meters } from '@/app/api/lib/models/meters';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return withApiAuth(req, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate parameters
      // ============================================================================
      const { searchParams } = new URL(req.url);
      const machineId = searchParams.get('machineId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!machineId || !startDate || !endDate) {
        return NextResponse.json(
          {
            success: false,
            error: 'machineId, startDate, and endDate are required',
          },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Find the single most recent meter document in the specified range
      // ============================================================================
      const start = new Date(startDate);
      const end = new Date(endDate);

      const latestMeter = await Meters.findOne({
        machine: machineId,
        readAt: { $gte: start, $lte: end },
      })
        .sort({ readAt: -1 })
        .lean<{ drop?: number; totalCancelledCredits?: number }>();

      const data = {
        sasMetersIn: latestMeter?.drop ?? 0,
        sasMetersOut: latestMeter?.totalCancelledCredits ?? 0,
      };

      // ============================================================================
      // STEP 3: Return data
      // ============================================================================
      return NextResponse.json({ success: true, data });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}
