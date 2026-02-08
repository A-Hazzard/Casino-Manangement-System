
/**
 * Vault Metrics Breakdown API
 * 
 * GET /api/vault/metrics/breakdown
 * 
 * Returns detailed transaction list for a specific metric (Cash In, Cash Out, Payouts).
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const userPayload = await getUserFromServer();
    if (!userPayload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const type = searchParams.get('type'); // 'in', 'out', 'payout'

    if (!locationId || !type) {
      return NextResponse.json({ success: false, error: 'locationId and type are required' }, { status: 400 });
    }

    await connectDB();

    // Access check
    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicensees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Timeframe: Default to Today's Gaming Day
    const locationInfo = await GamingLocations.findOne({ _id: locationId }, { gameDayOffset: 1 }).lean();
    const gameDayOffset = (locationInfo as any)?.gameDayOffset ?? 8;
    const gamingDayRange = getGamingDayRangeForPeriod('Today', gameDayOffset);

    const query: any = {
      locationId,
      timestamp: {
        $gte: gamingDayRange.rangeStart,
        $lte: gamingDayRange.rangeEnd,
      },
      isVoid: { $ne: true }
    };

    if (type === 'in') {
      query['to.type'] = 'vault';
    } else if (type === 'out') {
      query['from.type'] = 'vault';
    } else if (type === 'payout') {
      query.type = 'payout';
    }

    const transactions = await VaultTransactionModel.find(query)
      .sort({ timestamp: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: transactions
    });

  } catch (error) {
    console.error('Error fetching breakdown:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
