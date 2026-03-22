/**
 * Analytics Hourly Revenue API Route
 *
 * This route handles fetching hourly revenue data for a specific location.
 *
 * @module app/api/analytics/hourly-revenue/route
 */

import { getHourlyRevenue } from '@/app/api/lib/helpers/trends/general';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching hourly revenue data
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const timePeriod = searchParams.get('timePeriod') || '24h';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    const hourlyRevenue = await getHourlyRevenue(
      locationId,
      timePeriod,
      startDate,
      endDate
    );

    return NextResponse.json(hourlyRevenue);
  });
}
