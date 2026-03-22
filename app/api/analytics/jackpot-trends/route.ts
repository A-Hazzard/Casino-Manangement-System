/**
 * Analytics Jackpot Trends API Route
 *
 * This route handles fetching jackpot trends data over time.
 *
 * @module app/api/analytics/jackpot-trends/route
 */

import { getJackpotTrends } from '@/app/api/lib/helpers/trends/general';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { TimePeriod } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching jackpot trends data
 */
export async function GET(req: NextRequest) {
  return withApiAuth(req, async () => {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const locationIds = searchParams.get('locationIds');

    const jackpotTrends = await getJackpotTrends(
      timePeriod,
      licencee,
      locationIds
    );

    return NextResponse.json({
      success: true,
      data: jackpotTrends,
      timePeriod,
      locationIds: locationIds ? locationIds.split(',') : null,
    });
  });
}
