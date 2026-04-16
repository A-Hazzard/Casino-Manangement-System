/**
 * Win/Loss Trends Analytics API Route
 *
 * This route handles fetching win/loss trends data over time.
 *
 * @module app/api/analytics/winloss-trends/route
 */

import { getWinLossTrends } from '@/app/api/lib/helpers/trends/general';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import type { TimePeriod } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching win/loss trends
 */
export async function GET(req: NextRequest) {
  return withApiAuth(req, async () => {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const locationIds = searchParams.get('locationIds');

    const winLossTrends = await getWinLossTrends(
      timePeriod,
      licencee,
      locationIds
    );
    
    return NextResponse.json({
      success: true,
      data: winLossTrends,
      timePeriod,
      locationIds: locationIds ? locationIds.split(',') : null,
    });
  });
}
