/**
 * Vault Metrics Breakdown API
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { TimePeriod } from '@/app/api/lib/types';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';
import type { LocationDocument } from '@/lib/types/common';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      const type = searchParams.get('type');
      if (!locationId || !type)
        return NextResponse.json(
          { success: false, error: 'locationId and type are required' },
          { status: 400 }
        );

      const allowedLocationIds = await getUserLocationFilter(
        (userPayload?.assignedLicencees as string[]) || [],
        undefined,
        (userPayload?.assignedLocations as string[]) || [],
        userRoles
      );

      if (
        allowedLocationIds !== 'all' &&
        !allowedLocationIds.includes(locationId)
      ) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      const locationInfo = (await GamingLocations.findOne(
        { _id: locationId },
        { gameDayOffset: 1 }
      ).lean()) as Pick<LocationDocument, 'gameDayOffset'> | null;
      const gameDayOffset = locationInfo?.gameDayOffset ?? 8;
      const timePeriod = searchParams.get('timePeriod') || 'Today';
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');

      const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
        timePeriod as TimePeriod,
        gameDayOffset,
        startDateParam ? new Date(startDateParam) : undefined,
        endDateParam ? new Date(endDateParam) : undefined
      );

      const query: Record<string, unknown> = {
        locationId,
        timestamp: { $gte: rangeStart, $lte: rangeEnd },
        isVoid: { $ne: true },
      };
      if (type === 'in' || type === 'out')
        query.type = { $nin: ['vault_reconciliation', 'vault_open'] };
      if (type === 'in') query['to.type'] = 'vault';
      else if (type === 'out') query['from.type'] = 'vault';
      else if (type === 'payout') query.type = 'payout';

      const transactions = await VaultTransactionModel.find(query)
        .sort({ timestamp: -1 })
        .lean();
      return NextResponse.json({ success: true, data: transactions });
    } catch (error: unknown) {
      console.error('[Vault Metrics Breakdown API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
