/**
 * Analytics Dashboard API Route
 *
 * This route handles fetching dashboard analytics data for a specific licencee.
 *
 * @module app/api/analytics/dashboard/route
 */

import { getDashboardAnalytics } from '@/app/api/lib/helpers/reports/analytics';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/analytics/dashboard
 *
 * Returns aggregated financial metrics for a licencee's dashboard summary card.
 * Called on dashboard page load and whenever the licencee selector changes.
 *
 * Query params:
 * @param licencee  {string} Required. The licencee ID to scope all metric aggregation to.
 *                           Drives totalDrop, totalCancelledCredits, and totalGross calculations.
 * @param currency  {CurrencyCode} Optional. Target display currency (e.g. 'TTD', 'USD').
 *                                 When the licencee has currency conversion enabled, financial
 *                                 fields are converted from USD to this currency before returning.
 *                                 Defaults to 'USD' (no conversion applied).
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get('licencee');
    const displayCurrency = (searchParams.get('currency') as CurrencyCode) || 'USD';

    if (!licencee) {
      return NextResponse.json({ message: 'Licencee is required' }, { status: 400 });
    }

    const globalStats = await getDashboardAnalytics(licencee);

    let convertedStats = globalStats;
    if (shouldApplyCurrencyConversion(licencee)) {
      const financialFields = ['totalDrop', 'totalCancelledCredits', 'totalGross'];
      convertedStats = { ...globalStats };

      financialFields.forEach(field => {
        const value = (globalStats as Record<string, unknown>)[field];
        if (typeof value === 'number') {
          (convertedStats as Record<string, unknown>)[field] = convertFromUSD(value, displayCurrency);
        }
      });
    }

    return NextResponse.json({
      globalStats: convertedStats,
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
    });
  });
}
