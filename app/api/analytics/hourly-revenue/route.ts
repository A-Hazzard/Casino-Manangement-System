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
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/analytics/hourly-revenue
 *
 * Returns hourly revenue breakdown for a single location. Used by the location detail analytics view.
 *
 * Query params:
 * @param locationId {string} Required. The location to fetch hourly revenue for.
 * @param timePeriod {string} Optional. Time window descriptor. Defaults to '24h'.
 * @param startDate  {string} Optional. ISO datetime string for the start of a custom range.
 * @param endDate    {string} Optional. ISO datetime string for the end of a custom range.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/analytics/hourly-revenue';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const timePeriod = searchParams.get('timePeriod') || '24h';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!locationId) {
      logRouteError(
        functionName,
        'GET',
        '/api/analytics/hourly-revenue',
        'Location ID is required',
        user
      );
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const hourlyRevenue = await getHourlyRevenue(
      locationId,
      timePeriod,
      startDate,
      endDate
    );

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/analytics/hourly-revenue',
      1,
      user,
      duration
    );

    return NextResponse.json(hourlyRevenue);
  });
}
