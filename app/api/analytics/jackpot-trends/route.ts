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
 * GET /api/analytics/jackpot-trends
 *
 * Returns jackpot payout trend data aggregated over the requested period. Used by the Analytics jackpot trends chart.
 *
 * Query params:
 * @param timePeriod  {TimePeriod} Optional. 'Today'|'Yesterday'|'7d'|'30d'|'Custom'. Defaults to 'Today'.
 * @param licencee    {string}     Optional. Scopes results to this licencee.
 * @param locationIds {string}     Optional. Comma-separated location IDs to filter results.
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
