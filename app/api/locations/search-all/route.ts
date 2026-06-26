/**
 * Locations Search All API Route
 *
 * This route handles searching all locations with financial metrics and currency conversion.
 * It supports:
 * - Location name and ID search
 * - Licencee filtering
 * - Role-based access control
 * - Currency conversion (Admin/Developer only for "All Licencees")
 * - Financial metrics aggregation
 * - Machine statistics
 * - Machine type filtering (SMIB, Membership, Coordinates)
 * - Online status filtering and sorting
 *
 * @module app/api/locations/search-all/route
 */

import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  fetchLocationsWithMachinesForSmib,
  syncAllLocationSmibStatuses,
} from '@/app/api/lib/helpers/smibClassification';
import {
  getMoneyInScale,
  getMoneyOutAndJackpotScale,
} from '@/app/api/lib/utils/reviewerScale';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import {
  buildLocationSearchFilter,
  fetchMachineStats,
  computeFinancialMetrics,
  buildLocationResults,
  applyOnlineFilterAndSort,
  applyCurrencyConversion,
  formatSearchResponse,
} from '@/app/api/lib/helpers/locations/searchOperations';
import { Machine } from '@/app/api/lib/models/machines';
import { NextRequest, NextResponse } from 'next/server';
import type { TimePeriod } from '@/shared/types';
import type { CurrencyCode } from '@/shared/types/currency';

/**
 * Main GET handler for searching all locations
 *
 * Flow:
 * 1. Parse query parameters (licencee, search, currency)
 * 2. Connect to database
 * 3. Get user's accessible licencees and permissions
 * 4. Build location match filter
 * 5. Fetch aggregated machine stats
 * 6. Compute financial metrics (gaming day ranges, meters)
 * 7. Build hydrated location result objects
 * 8. Apply online status filtering
 * 9. Apply currency conversion if needed
 * 10. Format and sort final response
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    const startTime = Date.now();
    const functionName = 'GET /api/locations/search-all';
    const user = extractUserFromRequest(request);

    try {
      // ============================================================================
      // STEP 1: Parse query parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const licencee = searchParams.get('licencee') || '';
      const search = searchParams.get('search')?.trim() || '';
      const displayCurrency =
        (searchParams.get('currency') as CurrencyCode) || 'USD';
      const timePeriod =
        (searchParams.get('timePeriod') as TimePeriod) || '30d';
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');
      const customStartDate = startDateParam
        ? new Date(startDateParam)
        : undefined;
      const customEndDate = endDateParam ? new Date(endDateParam) : undefined;
      const machineTypeFilter = searchParams.get('machineTypeFilter');
      const onlineStatus =
        searchParams.get('onlineStatus')?.toLowerCase() || 'all';
      const showArchived =
        searchParams.get('archived') === 'true' ||
        searchParams.get('includeDeleted') === 'true';
      const syncAll = searchParams.get('syncAll') === 'true';

      // ============================================================================
      // STEP 2: Resolve user's accessible licencees and permissions
      // ============================================================================
      const userAccessibleLicencees =
        await getUserAccessibleLicenceesFromToken();
      const userLocationPermissions: string[] = Array.isArray(
        userPayload.assignedLocations
      )
        ? userPayload.assignedLocations
        : [];

      const allowedLocationIds = await getUserLocationFilter(
        userAccessibleLicencees,
        licencee || undefined,
        userLocationPermissions,
        userRoles,
        showArchived
      );

      if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
        return NextResponse.json([]);
      }

      // ============================================================================
      // STEP 4: Build location match filter
      // ============================================================================
      // WOW filter has no persisted location flag — derive IDs from WOW machines.
      let wowLocationIds: string[] | null = null;
      if (
        machineTypeFilter?.split(',').some(type => type.trim() === 'WowOnly')
      ) {
        const wowLocs = await Machine.distinct('gamingLocation', {
          'meta.dataSync.source': 'wow',
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        });
        wowLocationIds = wowLocs.map(id => String(id));
      }

      const locationMatch = buildLocationSearchFilter({
        showArchived,
        search,
        licencee,
        allowedLocationIds,
        machineTypeFilter,
        wowLocationIds,
      });

      // ============================================================================
      // STEP 5: Fetch aggregated machine stats
      // ============================================================================
      const matchingLocations = await fetchMachineStats(
        locationMatch,
        showArchived
      );

      // ============================================================================
      // STEP 6: Compute financial metrics
      // ============================================================================
      const {
        metersByLocation,
        memberCountMap,
        licenceeIncludeJackpotMap,
        allLocationIds,
        globalEnd,
      } = await computeFinancialMetrics(
        matchingLocations,
        timePeriod,
        customStartDate,
        customEndDate
      );

      // Compute reviewer scales
      const moneyInScale = getMoneyInScale(
        userPayload as {
          moneyInMultiplier?: number | null;
          roles?: string[];
          reviewerMultiplierStartTime?: Date | string | null;
        },
        globalEnd
      );
      const moneyOutScale = getMoneyOutAndJackpotScale(
        userPayload as {
          moneyOutAndJackpotMultiplier?: number | null;
          roles?: string[];
          reviewerMultiplierStartTime?: Date | string | null;
        },
        globalEnd
      );

      // Handle SMIB sync if requested
      if (syncAll && allLocationIds.length > 0) {
        console.log(
          `[Locations Search-All] syncAll=true - syncing SMIB for ${allLocationIds.length} locations`
        );
        const locationsWithMachines =
          await fetchLocationsWithMachinesForSmib(allLocationIds);
        await syncAllLocationSmibStatuses(locationsWithMachines);
      }

      // ============================================================================
      // STEP 7: Build hydrated location result objects
      // ============================================================================
      const hydratedLocations = buildLocationResults({
        matchingLocations,
        metersByLocation,
        memberCountMap,
        licenceeIncludeJackpotMap,
        syncAll,
        moneyInScale,
        moneyOutScale,
      });

      // ============================================================================
      // STEP 8: Apply online status filtering
      // ============================================================================
      const filteredLocations = applyOnlineFilterAndSort(
        hydratedLocations,
        onlineStatus
      );

      // ============================================================================
      // STEP 9: Apply currency conversion
      // ============================================================================
      const { locations: convertedLocations } = await applyCurrencyConversion(
        filteredLocations,
        displayCurrency,
        licencee
      );

      // ============================================================================
      // STEP 10: Format and sort final response
      // ============================================================================
      const finalResponse = formatSearchResponse(convertedLocations, search);

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/locations/search-all',
        finalResponse.length,
        user,
        duration
      );

      if (duration > 1000) {
        console.warn(`[Locations Search All API] Completed in ${duration}ms`);
      }

      return NextResponse.json(finalResponse);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      logRouteError(
        functionName,
        'GET',
        '/api/locations/search-all',
        errorMessage,
        user
      );
      console.error(
        `[Locations Search All API] Error after ${duration}ms:`,
        errorMessage
      );
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 500 }
      );
    }
  });
}
