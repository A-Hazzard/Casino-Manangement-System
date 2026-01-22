/**
 * Meters Report API Route
 *
 * This route handles fetching meter report data for machines across selected locations.
 * It supports:
 * - Gaming day offset calculations per location
 * - Getting the last meter document per machine (not summing)
 * - Hourly chart data aggregation
 * - Currency conversion for multi-licensee views
 * - Search and pagination
 *
 * @module app/api/reports/meters/route
 */

import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import {
  calculateGamingDayRanges,
  determineLocationList,
  fetchLocationData,
  fetchMachinesData,
  filterMeterDataBySearch,
  getHourlyChartData,
  getLastMeterPerMachine,
  paginateMeterData,
  parseMetersReportParams,
  transformMeterData,
  type ParsedMetersReportParams,
} from '@/app/api/lib/helpers/reports/meters';
import {
  applyCurrencyConversion,
  buildCurrencyMaps,
} from '@/app/api/lib/helpers/reports/metersCurrency';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Create an empty response for users with no accessible locations
 */
function createEmptyResponse(
  params: ParsedMetersReportParams,
  queryStartDate: Date,
  queryEndDate: Date
) {
  return NextResponse.json(
    {
      data: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: params.page,
      limit: params.limit,
      locations: [],
      dateRange: { start: queryStartDate, end: queryEndDate },
      timePeriod: params.timePeriod,
      currency: params.displayCurrency,
      converted: false,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    },
    {
      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}

/**
 * Main GET handler for meters report
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Authenticate user and check permissions
 * 3. Determine accessible locations
 * 4. Fetch machines and location data
 * 5. Calculate gaming day ranges
 * 6. Aggregate last meter per machine
 * 7. Optionally aggregate hourly chart data
 * 8. Transform and filter data
 * 9. Apply currency conversion if needed
 * 10. Paginate and return results
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const params = parseMetersReportParams(searchParams);

    // ============================================================================
    // STEP 2: Connect to database and authenticate user
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'DB connection failed' },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    // ============================================================================
    // STEP 3: Get user permissions and determine accessible locations
    // ============================================================================
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }

    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      params.licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // Determine if user is a location admin
    const normalizedRoles = userRoles.map(role =>
      typeof role === 'string' ? role.toLowerCase() : role
    );
    const isLocationAdmin = normalizedRoles.includes('location admin');

    // Determine final location list to query
    const locationList = determineLocationList(
      params.requestedLocationList,
      allowedLocationIds,
      isLocationAdmin
    );

    // Return empty response if user has no accessible locations
    if (
      allowedLocationIds !== 'all' &&
      allowedLocationIds.length === 0 &&
      locationList.length === 0
    ) {
      const now = new Date();
      return createEmptyResponse(params, now, now);
    }

    // ============================================================================
    // STEP 4: Fetch location data and calculate gaming day ranges
    // ============================================================================
    const locationsToQuery =
      locationList.length > 0
        ? locationList
        : allowedLocationIds === 'all'
          ? []
          : allowedLocationIds;

    const locationsData = await fetchLocationData(locationsToQuery);

    // Create location name map for quick lookup
    const locationMap = new Map<string, string>();
    locationsData.forEach(loc => {
      locationMap.set(loc._id, loc.name);
    });

    // Calculate gaming day ranges for all locations
    const { queryStartDate, queryEndDate } = calculateGamingDayRanges(
      locationsData,
      params.timePeriod,
      params.customStartDate,
      params.customEndDate
    );

    // ============================================================================
    // STEP 5: Fetch machines data
    // ============================================================================
    const machinesData = await fetchMachinesData(
      locationList,
      params.licencee
    );

    if (machinesData.length === 0) {
      return createEmptyResponse(params, queryStartDate, queryEndDate);
    }

    const machineIds = machinesData.map(m => m._id);

    // ============================================================================
    // STEP 6: Get last meter document per machine
    // ============================================================================
    /**
     * CRITICAL: We get the LAST meter document for each machine, not a sum.
     * The aggregation sorts by readAt descending and uses $first to get
     * the latest document's absolute values (drop, coinIn, coinOut, etc.).
     * These are cumulative totals from the meter, representing the final
     * state at the end of the gaming day period.
     */
    const metersMap = await getLastMeterPerMachine(
      machineIds,
      queryStartDate,
      queryEndDate
    );

    // ============================================================================
    // STEP 7: Optionally aggregate hourly chart data
    // ============================================================================
    /**
     * Hourly chart data uses movement fields (deltas) and sums them by hour.
     * This is different from the main meter aggregation which uses absolute values.
     *
     * If hourlyDataMachineIds is provided, only aggregate data for those specific machines.
     * Otherwise, aggregate data for all machines in the selected locations.
     */
    let hourlyChartData = null;
    if (params.includeHourlyData && locationList.length > 0) {
      const machineIdsForHourlyData =
        params.hourlyDataMachineIds && params.hourlyDataMachineIds.length > 0
          ? params.hourlyDataMachineIds
          : machineIds;

      hourlyChartData = await getHourlyChartData(
        machineIdsForHourlyData,
        queryStartDate,
        queryEndDate,
        params.granularity || 'hourly'
      );
    }

    // ============================================================================
    // STEP 8: Transform machine and meter data into report format
    // ============================================================================
    let transformedData = transformMeterData(
      machinesData,
      metersMap,
      locationMap
    );

    // ============================================================================
    // STEP 9: Apply search filter if provided
    // ============================================================================
    transformedData = filterMeterDataBySearch(
      transformedData,
      machinesData,
      params.search
    );

    console.log('[Meters Report API] After search filter:', {
      filteredCount: transformedData.length,
      searchTerm: params.search,
    });

    // ============================================================================
    // STEP 10: Paginate data
    // ============================================================================
    const { paginatedData, totalCount, totalPages } = paginateMeterData(
      transformedData,
      params.page,
      params.limit
    );

    // ============================================================================
    // STEP 11: Apply currency conversion if needed
    // ============================================================================
    /**
     * Currency conversion is ONLY applied when:
     * 1. User is Admin/Developer
     * 2. "All Licensees" is selected (params.licencee is null, undefined, or "all")
     * 3. A display currency is explicitly selected (currency param is provided)
     *
     * When viewing a specific licensee, NO conversion should happen - values should
     * be displayed in that licensee's native currency.
     */
    let convertedData = paginatedData;
    // Currency conversion should ONLY happen when:
    // 1. User is Admin/Developer
    // 2. "All Licensees" is EXPLICITLY selected (licencee parameter must be "all")
    // 3. Currency parameter is explicitly provided in the request
    //
    // IMPORTANT: The frontend only sends licencee parameter when it's NOT "all".
    // So if licencee is missing, we're NOT viewing "all licensees" mode.
    // Only convert when licencee is explicitly "all".
    const licenceeParam = searchParams.get('licencee');
    const currencyParamProvided = searchParams.get('currency') !== null;

    // Only convert when explicitly viewing "all licensees" mode
    const shouldConvert =
      isAdminOrDev && licenceeParam === 'all' && currencyParamProvided;

    if (shouldConvert) {
      const { locationDetailsMap, licenseeMap } = await buildCurrencyMaps(
        locationsData
      );

      convertedData = applyCurrencyConversion(
        paginatedData,
        locationDetailsMap,
        licenseeMap,
        params.displayCurrency
      );
    }

    // ============================================================================
    // STEP 12: Build and return response
    // ============================================================================
    const actualLocationIds = locationsData.map(loc => loc._id);
    const responseLocationList =
      locationList.length > 0 ? locationList : actualLocationIds;

    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(
        `[Meters Report API] Slow response: ${duration}ms for ${totalCount} machines`
      );
    }

    // Convert Date objects to ISO strings for JSON serialization
    const serializedData = convertedData.map(item => ({
      ...item,
      createdAt: item.createdAt
        ? new Date(item.createdAt).toISOString()
        : new Date().toISOString(),
    }));

    const response = {
      data: serializedData,
      totalCount,
      totalPages,
      currentPage: params.page,
      limit: params.limit,
      locations: responseLocationList,
      dateRange: { start: queryStartDate, end: queryEndDate },
      timePeriod: params.timePeriod,
      currency: params.displayCurrency,
      converted: shouldConvert,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalCount,
        totalPages,
        hasNextPage: params.page < totalPages,
        hasPrevPage: params.page > 1,
      },
      ...(hourlyChartData && { hourlyChartData }),
    };

    // Prevent caching to avoid stale data issues
    return NextResponse.json(response, {
      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Server Error';

    console.error(`Meters report failed after ${duration}ms:`, errorMessage);

    // Handle validation errors with 400 status
    if (err instanceof Error && err.message.includes('required')) {
      return NextResponse.json(
        { error: errorMessage },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}

