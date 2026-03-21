
/**
 * Vault Metrics Breakdown API
 * 
 * GET /api/vault/metrics/breakdown
 * 
 * Returns detailed transaction list for a specific metric (Cash In, Cash Out, Payouts).
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { NextRequest, NextResponse } from 'next/server';
import type { LocationDocument } from '@/lib/types/common';

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
      (userPayload?.assignedLicencees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Timeframe: Default to Today's Gaming Day
    const locationInfo = (await GamingLocations.findOne({ _id: locationId }, { gameDayOffset: 1 }).lean()) as Pick<LocationDocument, 'gameDayOffset'> | null;
    const gameDayOffset = locationInfo?.gameDayOffset ?? 8;
    const gamingDayRange = getGamingDayRangeForPeriod('Today', gameDayOffset);

    const query: Record<string, unknown> = {
      locationId,
      timestamp: {
        $gte: gamingDayRange.rangeStart,
        $lte: gamingDayRange.rangeEnd,
      },
      isVoid: { $ne: true }
    };

    if (type === 'in' || type === 'out') {
      query.type = { $nin: ['vault_reconciliation', 'vault_open'] };
    }

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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching breakdown:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
