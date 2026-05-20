/**
 * Collection Report V2 — Custom System Meters Calculation API
 *
 * GET /api/collection-reports-v2/custom-meters
 * Calculates system meters for a custom collection period by summing drop
 * and totalCancelledCredits outside the movement object in the Meters collection.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { Meters } from '@/app/api/lib/models/meters';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // 1. Authenticate user
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate parameters
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!machineId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'machineId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // 3. Find the single most recent meter document in the specified range
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

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
