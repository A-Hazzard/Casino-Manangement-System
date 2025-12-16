/**
 * Top Performing Metrics API Route
 *
 * This route handles fetching top performing locations or cabinets based on moneyIn (drop).
 * It supports:
 * - Filtering by activeTab (locations or cabinets)
 * - Filtering by timePeriod (Today, Yesterday, 7d, 30d)
 * - Optional filtering by licensee
 *
 * @module app/api/metrics/top-performing/route
 */

import { shouldApplyCurrencyConversion } from '@/app/api/lib/helpers/currencyHelper';
import { getTopPerformingMetrics } from '@/app/api/lib/helpers/top-performing';
import type { TopPerformingItem } from '@/app/api/lib/helpers/topPerformingCurrencyConversion';
import { convertTopPerformingCurrency } from '@/app/api/lib/helpers/topPerformingCurrencyConversion';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { TimePeriod } from '@/app/api/lib/types';
import { getLicenseeObjectId } from '@/lib/utils/licenseeMapping';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

type ActiveTab = 'locations' | 'Cabinets';

/**
 * Main GET handler for fetching top performing metrics
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch top performing metrics
 * 4. Apply currency conversion if needed
 * 5. Return top performing data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const searchParams = req.nextUrl.searchParams;
    const activeTab =
      (searchParams.get('activeTab') as ActiveTab) || 'locations';
    const timePeriod: TimePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || '7d';

    // Raw licensee from query (name, id, or "all")
    const rawLicensee =
      searchParams.get('licensee') || searchParams.get('licencee') || null;

    // Normalize licensee for DB filtering:
    // - Map known names (TTG, Cabana, etc.) → ObjectId
    // - Treat "all" / empty as undefined (no filter)
    let licenseeForFilter: string | undefined;
    if (rawLicensee && rawLicensee !== 'all') {
      licenseeForFilter = getLicenseeObjectId(rawLicensee) || rawLicensee;
    }

    const currencyParam = searchParams.get('currency') as CurrencyCode | null;
    const displayCurrency: CurrencyCode = currencyParam || 'USD';

    // Parse custom date range for Custom time period
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    let customStartDate: Date | undefined;
    let customEndDate: Date | undefined;

    if (timePeriod === 'Custom' && startDateParam && endDateParam) {
      customStartDate = new Date(startDateParam);
      customEndDate = new Date(endDateParam);

      // Validate dates
      if (isNaN(customStartDate.getTime()) || isNaN(customEndDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date parameters' },
          { status: 400 }
        );
      }
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Fetch top performing metrics
    // ============================================================================
    const data = await getTopPerformingMetrics(
      db,
      activeTab,
      timePeriod,
      licenseeForFilter,
      customStartDate,
      customEndDate
    );

    // ============================================================================
    // STEP 4: Apply currency conversion if needed
    // ============================================================================
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const isAdminOrDev =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer');

    let convertedData = data as unknown as TopPerformingItem[];

    // Currency conversion ONLY for Admin/Developer when viewing "All Licensees" (no specific licensee selected)
    // Only apply conversion if "all licensees" is selected AND display currency is not USD
    const shouldConvert =
      isAdminOrDev &&
      shouldApplyCurrencyConversion(rawLicensee) &&
      displayCurrency &&
      displayCurrency !== 'USD';

    if (shouldConvert) {
      convertedData = await convertTopPerformingCurrency(
        convertedData,
        displayCurrency
      );
    }

    // ============================================================================
    // STEP 5: Return top performing data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Top Performing API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      activeTab,
      timePeriod,
      data: convertedData,
      currency: displayCurrency,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';
    console.error(
      `[Top Performing Metrics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
