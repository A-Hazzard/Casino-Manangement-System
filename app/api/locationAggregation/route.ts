/**
 * Location Aggregation API Route
 *
 * This route handles fetching aggregated location metrics with filtering and currency conversion.
 * It supports:
 * - GET: Retrieves location metrics with optional filtering by time period, licencee, machine type,
 *        and currency conversion for admin/developer users viewing all licencees
 *
 * @module app/api/locationAggregation/route
 */

import {
  clearCache,
  getCacheKey,
  getCachedData,
  setCachedData,
} from '@/app/api/lib/helpers/cacheUtils';
import { convertLocationCurrency } from '@/app/api/lib/helpers/currency/location';
import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getLocationsWithMetrics } from '@/app/api/lib/helpers/locationAggregation';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Meters } from '@/app/api/lib/models/meters';
import { TimePeriod } from '@/app/api/lib/types';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { LocationFilter } from '@/lib/types/location';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for location aggregation
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Handle cache clearing if requested
 * 3. Calculate date range for time period
 * 4. Check cache for existing results
 * 5. Connect to database and verify data availability
 * 6. Fetch aggregated location metrics
 * 7. Apply machine type filters
 * 8. Sort locations by money in
 * 9. Apply currency conversion if needed
 * 10. Cache and return results
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '7d';
    const licencee = (searchParams.get('licencee')) || undefined;
    const currencyParam = searchParams.get('currency') as CurrencyCode | null;
    let displayCurrency: CurrencyCode = currencyParam || 'USD';
    const machineTypeFilter =
      (searchParams.get('machineTypeFilter') as LocationFilter) || null;
    const clearCacheParam = searchParams.get('clearCache') === 'true';
    const sasEvaluationOnly = searchParams.get('sasEvaluationOnly') === 'true';
    const basicList = searchParams.get('basicList') === 'true';
    const selectedLocations = searchParams.get('selectedLocations');
    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 1000000;
    const search = searchParams.get('search') || null;
    const onlineStatus = searchParams.get('onlineStatus')?.toLowerCase() || 'all';

    // ============================================================================
    // STEP 2: Handle cache clearing if requested
    // ============================================================================
    if (clearCacheParam) {
      clearCache();
    }

    // ============================================================================
    // STEP 3: Parse custom dates if provided (for Custom time period)
    // ============================================================================
    // NOTE: For non-Custom periods, we don't need startDate/endDate here because
    // the helper function getLocationsWithMetrics uses timePeriod directly to calculate
    // gaming day ranges per location. We only need dates for Custom periods.
    let customStartDate: Date | undefined;
    let customEndDate: Date | undefined;
    // For cache key generation, we still need date representation
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (timePeriod === 'Custom') {
      const customStart = searchParams.get('startDate');
      const customEnd = searchParams.get('endDate');
      if (!customStart || !customEnd) {
        const duration = Date.now() - startTime;
        console.error(
          `[Location Aggregation GET API] Missing startDate or endDate after ${duration}ms.`
        );
        return NextResponse.json(
          { error: 'Missing startDate or endDate' },
          { status: 400 }
        );
      }
      // Parse dates - check if they already include time (ISO format) or just date
      customStartDate = customStart.includes('T')
        ? new Date(customStart)
        : new Date(customStart + 'T00:00:00.000Z');
      customEndDate = customEnd.includes('T')
        ? new Date(customEnd)
        : new Date(customEnd + 'T00:00:00.000Z');

      // Validate dates are valid
      if (isNaN(customStartDate.getTime()) || isNaN(customEndDate.getTime())) {
        const duration = Date.now() - startTime;
        console.error(
          `[Location Aggregation GET API] Invalid date format after ${duration}ms. startDate: ${customStart}, endDate: ${customEnd}`
        );
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }

      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      // For cache key: use timePeriod string representation instead of calendar dates
      // The actual data calculation uses gaming day ranges per location
      // We use undefined dates for cache key to ensure timePeriod is the primary key
      startDate = undefined;
      endDate = undefined;
    }

    // ============================================================================
    // STEP 4: Connect to database and verify data availability
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      const duration = Date.now() - startTime;
      console.error(
        `[Location Aggregation GET API] Database connection failed after ${duration}ms.`
      );
      return NextResponse.json(
        { error: 'DB connection failed' },
        { status: 500 }
      );
    }

    // Quick data availability check with timeout
    const dataCheckPromise = Promise.all([
      Meters.countDocuments({}).limit(1),
      GamingLocations.countDocuments({}).limit(1),
    ]);

    const dataCheckTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Data check timeout')), 10000)
    );

    try {
      await Promise.race([dataCheckPromise, dataCheckTimeout]);
    } catch (error) {
      console.warn(
        '[Location Aggregation GET API] Data availability check failed, proceeding anyway:',
        error
      );
    }

    // ============================================================================
    // STEP 5: Get user's accessible locations (for permission filtering)
    // ============================================================================
    // DEV MODE: Allow bypassing auth for testing
    const isDevMode = process.env.NODE_ENV === 'development';
    const testUserId = searchParams.get('testUserId');

    let userPayload;
    let userRoles: string[] = [];
    let userLocationPermissions: string[] = [];
    let userAccessibleLicencees: string[] | 'all' = [];

    if (isDevMode && testUserId) {
      // Dev mode: Get user directly from DB for testing
      const UserModel = (await import('../lib/models/user')).default;
      const testUserResult = await UserModel.findOne({
        _id: testUserId,
      }).lean();
      if (testUserResult && !Array.isArray(testUserResult)) {
        const testUser = testUserResult as {
          roles?: string[];
          assignedLocations?: string[];
          assignedLicencees?: string[];
        };
        userRoles = (testUser.roles || []) as string[];
        userLocationPermissions = Array.isArray(testUser.assignedLocations)
          ? testUser.assignedLocations.map((id: string) => String(id))
          : [];
        userAccessibleLicencees = Array.isArray(testUser.assignedLicencees)
          ? testUser.assignedLicencees.map((id: string) => String(id))
          : [];
      } else {
        return NextResponse.json(
          { error: 'Test user not found' },
          { status: 404 }
        );
      }
    } else {
      // Normal mode: Get user from JWT
      userPayload = await getUserFromServer();
      if (!userPayload && !isDevMode) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (userPayload) {
        userRoles = (userPayload.roles as string[]) || [];
        // Extract assignedLocations from new field only
        const assignedLocations = (
          userPayload as { assignedLocations?: string[] }
        )?.assignedLocations;
        if (Array.isArray(assignedLocations) && assignedLocations.length > 0) {
          userLocationPermissions = assignedLocations;
        }
      }
      userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
    }

    // In normal mode (not dev mode or no testUserId), get licencees from token
    if (!isDevMode || !testUserId) {
      userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
    }

    // ============================================================================
    // STEP 4.5: Determine display currency (if not provided) - AFTER DB connection
    // ============================================================================
    if (!currencyParam && userAccessibleLicencees !== 'all') {
      // For non-admin users, auto-detect currency from their licencee
      let resolvedLicencee: string | undefined =
        licencee && licencee !== 'all' ? licencee : undefined;
      if (
        !resolvedLicencee &&
        Array.isArray(userAccessibleLicencees) &&
        userAccessibleLicencees.length === 1
      ) {
        resolvedLicencee = userAccessibleLicencees[0];
      }

      if (resolvedLicencee) {
        // Get licencee name from ID to properly resolve currency
        try {
          const licenceeDoc = await Licencee.findOne(
            { _id: resolvedLicencee },
            { name: 1 }
          ).lean();
          if (licenceeDoc && !Array.isArray(licenceeDoc) && licenceeDoc.name) {
            const { getLicenceeCurrency } = await import('@/lib/helpers/rates');
            displayCurrency = getLicenceeCurrency(licenceeDoc.name);
          }
        } catch {
          // Failed to get licencee name for currency - use default USD
        }
      }
    }

    // Get allowed location IDs (respects user permissions and licencee filter)
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicencees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 6: Check cache for existing results (AFTER getting user permissions)
    // ============================================================================
    // Include user-specific permissions in cache key to prevent cross-user cache hits
    const cacheKey = getCacheKey({
      timePeriod,
      licencee,
      machineTypeFilter,
      startDate,
      endDate,
      page,
      limit,
      sasEvaluationOnly,
      basicList,
      selectedLocations,
      currency: displayCurrency,
      search,
      onlineStatus,
      allowedLocationIds:
        allowedLocationIds === 'all'
          ? 'all'
          : Array.isArray(allowedLocationIds)
            ? allowedLocationIds.sort().join(',')
            : 'none',
    });

    const skipCacheForSelected = Boolean(selectedLocations);

    if (!clearCacheParam && !skipCacheForSelected) {
      const cachedResult = getCachedData(cacheKey);
      if (cachedResult) {
        return NextResponse.json(cachedResult);
      }
    }

    // ============================================================================
    // STEP 7: Fetch aggregated location metrics (with backend filtering)
    // ============================================================================
    const { rows, totalCount } = await getLocationsWithMetrics(
      licencee,
      page,
      limit,
      sasEvaluationOnly,
      basicList,
      selectedLocations || undefined,
      timePeriod,
      customStartDate,
      customEndDate,
      allowedLocationIds,
      machineTypeFilter,
      search,
      onlineStatus
    );

    // Filtering is now done at database level in getLocationsWithMetrics
    const filteredRows = rows;

    // ============================================================================
    // STEP 9: Sort locations by money in
    // ============================================================================
    const sortedRows = filteredRows.sort(
      (a, b) => (b.moneyIn || 0) - (a.moneyIn || 0)
    );

    // ============================================================================
    // STEP 10: Apply currency conversion if needed
    // ============================================================================
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const isAdminOrDev =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer') ||
      currentUserRoles.includes('owner');

    let convertedRows = sortedRows;
    if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
      convertedRows = await convertLocationCurrency(
        sortedRows,
        displayCurrency,
        licencee
      );
    }

    // ============================================================================
    // STEP 10.5: Apply Reviewer Multiplier Scaling
    // ============================================================================
    const reviewerMult = (currentUser as { multiplier?: number | null })?.multiplier ?? null;
    if (reviewerMult !== null) {
      const scale = 1 - reviewerMult;
      convertedRows = convertedRows.map((row) => ({
        ...row,
        moneyIn: typeof row.moneyIn === 'number' ? row.moneyIn * scale : row.moneyIn,
        moneyOut: typeof row.moneyOut === 'number' ? row.moneyOut * scale : row.moneyOut,
        jackpot: typeof row.jackpot === 'number' ? row.jackpot * scale : row.jackpot,
        gross: typeof row.gross === 'number' ? row.gross * scale : row.gross,
      }));
    }

    // ============================================================================
    // STEP 11: Cache and return results
    // ============================================================================

    const result = {
      data: convertedRows,
      totalCount: totalCount,
      page,
      limit,
      hasMore: false,
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
    };

    if (!clearCacheParam && !skipCacheForSelected) {
      setCachedData(cacheKey, result);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    console.error(
      `[Location Aggregation GET API] Error after ${duration}ms:`,
      errorMessage
    );
    if (error instanceof Error) {
      console.error('[Location Aggregation GET API] Error stack:', error.stack);
    }
    console.error('[Location Aggregation GET API] Full error:', error);

    // Handle specific MongoDB connection errors
    if (error instanceof Error) {
      const errorMessageLower = errorMessage.toLowerCase();

      // MongoDB connection timeout
      if (
        errorMessageLower.includes('mongonetworktimeouterror') ||
        (errorMessageLower.includes('connection') &&
          errorMessageLower.includes('timed out'))
      ) {
        return NextResponse.json(
          {
            error: 'Database connection timeout',
            message:
              'The database is currently experiencing high load. Please try again in a few moments.',
            type: 'CONNECTION_TIMEOUT',
            retryable: true,
          },
          { status: 503 }
        );
      }

      // MongoDB server selection error
      if (
        errorMessageLower.includes('mongoserverselectionerror') ||
        errorMessageLower.includes('server selection')
      ) {
        return NextResponse.json(
          {
            error: 'Database server unavailable',
            message:
              'Unable to connect to the database server. Please try again later.',
            type: 'SERVER_UNAVAILABLE',
            retryable: true,
          },
          { status: 503 }
        );
      }

      // Generic MongoDB connection error
      if (
        errorMessageLower.includes('mongodb') ||
        errorMessageLower.includes('connection')
      ) {
        return NextResponse.json(
          {
            error: 'Database connection failed',
            message:
              'Unable to establish connection to the database. Please try again.',
            type: 'CONNECTION_ERROR',
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.',
        type: 'INTERNAL_ERROR',
        retryable: false,
      },
      { status: 500 }
    );
  }
}

