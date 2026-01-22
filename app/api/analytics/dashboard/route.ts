/**
 * Analytics Dashboard API Route
 *
 * This route handles fetching dashboard analytics data for a specific licensee.
 * It supports:
 * - Filtering by licensee
 * - Aggregating financial and machine statistics
 * - Currency conversion
 *
 * @module app/api/analytics/dashboard/route
 */

import { getDashboardAnalytics } from '@/app/api/lib/helpers/reports/analytics';
import { connectDB } from '@/app/api/lib/middleware/db';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching dashboard analytics
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch dashboard analytics data
 * 4. Apply currency conversion if needed
 * 5. Return dashboard analytics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get('licensee');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    if (!licensee) {
      return NextResponse.json(
        { message: 'Licensee is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Fetch dashboard analytics data
    // ============================================================================
    const globalStats = await getDashboardAnalytics(licensee);

    // ============================================================================
    // STEP 4: Apply currency conversion if needed
    // ============================================================================
    let convertedStats = globalStats;

    if (shouldApplyCurrencyConversion(licensee)) {
      const financialFields = [
        'totalDrop',
        'totalCancelledCredits',
        'totalGross',
      ];
      convertedStats = { ...globalStats };

      financialFields.forEach(field => {
        const value = (globalStats as Record<string, unknown>)[field];
        if (typeof value === 'number') {
          (convertedStats as Record<string, unknown>)[field] = convertFromUSD(
            value,
            displayCurrency
          );
        }
      });
    }

    // ============================================================================
    // STEP 5: Return dashboard analytics
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Dashboard GET API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      globalStats: convertedStats,
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licensee),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch dashboard analytics';
    console.error(
      `[Analytics Dashboard GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        message: 'Failed to fetch dashboard analytics',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

