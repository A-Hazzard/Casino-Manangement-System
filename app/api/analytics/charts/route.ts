/**
 * Analytics Charts API Route
 *
 * This route handles fetching chart data for analytics visualization.
 *
 * @module app/api/analytics/charts/route
 */

import { getChartsData } from '@/app/api/lib/helpers/reports/analytics';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/analytics/charts
 *
 * Returns time-series chart data for revenue and financial metrics. Used by the Analytics dashboard charts section.
 *
 * Query params:
 * @param licencee  {string}              Required. Scopes results to this licencee.
 * @param period    {'last7days'|'last30days'} Optional. Time window for the chart data. Defaults to 'last30days'.
 * @param currency  {CurrencyCode}        Optional. Display currency for converted values. Defaults to 'USD'.
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get('licencee');
    const period = (searchParams.get('period') as 'last7days' | 'last30days') || 'last30days';
    const displayCurrency = (searchParams.get('currency') as CurrencyCode) || 'USD';

    if (!licencee) {
      return NextResponse.json({ message: 'Licencee is required' }, { status: 400 });
    }

    const chartsData = await getChartsData(licencee, period, displayCurrency);
    return NextResponse.json(chartsData);
  });
}
