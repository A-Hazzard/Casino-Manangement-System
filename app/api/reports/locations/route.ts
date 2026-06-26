/**
 * Locations Report API Route
 *
 * Fetches aggregated reporting data for gaming locations with financial metrics,
 * SMIB classification, machine counts, and online status.
 *
 * Supports filters: licencee, time period, machine type, search, online status,
 * pagination, sorting, summary mode, and archived locations.
 *
 * @module app/api/reports/locations/route
 */

import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getMemberCountsPerLocation } from '@/app/api/lib/helpers/membershipAggregation';
import {
  applyLocationsCurrencyConversion,
  handleSummaryMode,
} from '@/app/api/lib/helpers/reports/locations';
import {
  parseReportLocationsParams,
  resolveLicenceeAndDisplayCurrency,
  buildLocationMatchStage,
  applySmibClassification,
  computeLocationMetrics,
  getLicenceeJackpotSettings,
  buildLocationResults,
  applyNonSmibOfflineOverride,
  filterAndSortLocations,
  createEmptyResponse,
} from '@/app/api/lib/helpers/reports/locationReportOperations';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import type { GamingMachine } from '@shared/types';
import type { LocationDocument } from '@/lib/types/common';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import {
  logRouteFetch,
  logRouteError,
  logRouteRequest,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import {
  getMoneyInScale,
  getMoneyOutAndJackpotScale,
} from '@/app/api/lib/utils/reviewerScale';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return withApiAuth(
    req,
    async ({ user: userPayload, userRoles, isAdminOrDev }) => {
      const startTime = Date.now();
      const functionName = 'GET /api/reports/locations';
      const user = extractUserFromRequest(req);
      logRouteRequest(functionName, 'GET', '/api/reports/locations', user);

      // Formats a location list as "name (id)" lines for diagnostic logging.
      const formatLocations = (
        locs: Array<{
          _id?: unknown;
          id?: unknown;
          name?: unknown;
          locationName?: unknown;
        }>,
        wowIds?: Set<string> | null
      ): string =>
        locs
          .map(loc => {
            const id = String(loc._id ?? loc.id ?? '');
            const name = String(loc.name ?? loc.locationName ?? '(no name)');
            const flag = wowIds ? (wowIds.has(id) ? ' [WOW]' : ' [NON-WOW]') : '';
            return `  • ${name} (${id})${flag}`;
          })
          .join('\n');

      try {
        // ============================================================================
        // STEP 1: Parse and validate request parameters
        // ============================================================================
        const { searchParams } = new URL(req.url);
        const params = parseReportLocationsParams(searchParams);

        console.log(
          `[${functionName}] PARAMS | machineTypeFilter=${JSON.stringify(params.machineTypeFilter)} | licencee=${JSON.stringify(params.licencee)} | timePeriod=${params.timePeriod} | onlineStatus=${params.onlineStatus} | showArchived=${params.showArchived} | search=${JSON.stringify(params.searchTerm)} | page=${params.page} limit=${params.limit}`
        );

        if (params.timePeriod === 'Custom' && !params.customStartDate) {
          return NextResponse.json(
            { error: 'Missing dates' },
            { status: 400 }
          );
        }

        // ============================================================================
        // STEP 2: Determine accessible locations and display currency
        // ============================================================================
        const userLocationPermissions =
          (userPayload as { assignedLocations?: string[] })
            ?.assignedLocations || [];
        const userAccessibleLicencees =
          await getUserAccessibleLicenceesFromToken();

        const { displayCurrency } =
          await resolveLicenceeAndDisplayCurrency(
            params.licencee,
            params.currencyParam,
            userAccessibleLicencees
          );

        const allowedLocationIds = await getUserLocationFilter(
          userAccessibleLicencees,
          params.licencee || undefined,
          userLocationPermissions,
          userRoles,
          params.showArchived
        );

        // ============================================================================
        // STEP 3: Build location match stage and fetch locations
        // ============================================================================
        if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0)
          return createEmptyResponse(params.page, params.limit, displayCurrency);

        // WOW filter needs location IDs derived from WOW machines (no persisted flag).
        let wowLocationIds: string[] | null = null;
        const wowFilterActive = Boolean(
          params.machineTypeFilter
            ?.split(',')
            .some(type => type.trim() === 'WowOnly')
        );
        if (wowFilterActive) {
          const wowLocs = await Machine.distinct('gamingLocation', {
            'meta.dataSync.source': 'wow',
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          });
          wowLocationIds = wowLocs.map(id => String(id));
          console.log(
            `[${functionName}] WOW FILTER ACTIVE | wow machines→${wowLocs.length} distinct location(s)=${wowLocationIds.length} | allowedLocationIds=${allowedLocationIds === 'all' ? 'all' : `${allowedLocationIds.length} ids`}`
          );
        }

        const wowIdSet = wowLocationIds ? new Set(wowLocationIds) : null;

        const locationMatchStage = buildLocationMatchStage({
          showArchived: params.showArchived,
          allowedLocationIds,
          specificLocations: params.specificLocations,
          licencee: params.licencee,
          searchTerm: params.searchTerm,
          machineTypeFilter: params.machineTypeFilter,
          isAdminOrDev,
          wowLocationIds,
        });

        if (wowFilterActive) {
          console.log(
            `[${functionName}] MATCH STAGE | ${JSON.stringify(locationMatchStage)}`
          );
        }

        const locations =
          await GamingLocations.find(locationMatchStage).lean<
            LocationDocument[]
          >();

        if (wowFilterActive) {
          const leaks = locations.filter(
            loc => !wowIdSet?.has(String(loc._id))
          );
          console.log(
            `[${functionName}] LOCATIONS FOUND | ${locations.length} total | ${leaks.length} NON-WOW leak(s)\n${formatLocations(locations, wowIdSet)}`
          );
        }

        if (searchParams.get('summary') === 'true') {
          return await handleSummaryMode(locations, displayCurrency, startTime);
        }

        const allLocationIds = locations.map(loc => String(loc._id));

        // ============================================================================
        // STEP 4: Fetch machines and build machine-to-location map
        // ============================================================================
        const machineMatch: Record<string, unknown> = {
          gamingLocation: { $in: allLocationIds },
        };
        if (!params.showArchived) {
          machineMatch.$or = [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ];
        } else {
          machineMatch.deletedAt = { $gte: new Date('2025-01-01') };
        }

        const allMachinesData =
          await Machine.find(machineMatch).lean<GamingMachine[]>();
        const allMachineIds = allMachinesData.map(m => String(m._id));

        const locationToMachines = new Map<string, GamingMachine[]>();
        allMachinesData.forEach(m => {
          const locId = String(m.gamingLocation!);
          if (!locationToMachines.has(locId)) locationToMachines.set(locId, []);
          locationToMachines.get(locId)!.push(m);
        });

        // ============================================================================
        // STEP 5: SMIB auto-tag and compute metrics
        // ============================================================================
        await applySmibClassification(
          locations,
          params.syncAll,
          allLocationIds,
          locationToMachines
        );

        const locationRanges = getGamingDayRangesForLocations(
          locations.map(loc => ({
            _id: String(loc._id),
            gameDayOffset: loc.gameDayOffset ?? 8,
          })),
          params.timePeriod,
          params.customStartDate,
          params.customEndDate
        );

        let globalStart = new Date();
        let globalEnd = new Date(0);
        locationRanges.forEach(range => {
          if (range.rangeStart < globalStart) globalStart = range.rangeStart;
          if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
        });

        const metricsMap = await computeLocationMetrics(
          allLocationIds,
          allMachineIds,
          globalStart,
          globalEnd,
          locationRanges
        );

        const memberCountMap = await getMemberCountsPerLocation(allLocationIds);
        const licenceeIncludeJackpotMap = await getLicenceeJackpotSettings(locations);

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

        const locationResults = buildLocationResults(
          locations,
          locationToMachines,
          metricsMap,
          memberCountMap,
          licenceeIncludeJackpotMap,
          moneyInScale,
          moneyOutScale
        );

        // ============================================================================
        // STEP 5.5: Non-SMIB offline collection override
        // ============================================================================
        await applyNonSmibOfflineOverride(locationResults);

        // ============================================================================
        // STEP 6: Filter, sort, and paginate results
        // ============================================================================
        const sortedResults = filterAndSortLocations(
          locationResults,
          params.onlineStatus,
          params.sortBy,
          params.sortOrder
        );

        const paginated = sortedResults.slice(params.skip, params.skip + params.limit);

        if (wowFilterActive) {
          const returnedLeaks = paginated.filter(
            loc => !wowIdSet?.has(String((loc as { id?: unknown; _id?: unknown }).id ?? (loc as { _id?: unknown })._id))
          );
          console.log(
            `[${functionName}] LOCATIONS RETURNED | ${paginated.length} of ${sortedResults.length} after sort/paginate | ${returnedLeaks.length} NON-WOW leak(s)\n${formatLocations(paginated as Array<{ _id?: unknown; locationName?: unknown }>, wowIdSet)}`
          );
        }

        const converted = await applyLocationsCurrencyConversion(
          paginated,
          params.licencee,
          displayCurrency,
          isAdminOrDev
        );

        const duration = Date.now() - startTime;
        logRouteFetch(
          functionName,
          'GET',
          '/api/reports/locations',
          sortedResults.length,
          user,
          duration
        );

        // ============================================================================
        // STEP 7: Return final response
        // ============================================================================
        return NextResponse.json({
          data: converted,
          pagination: {
            page: params.page,
            limit: params.limit,
            totalCount: sortedResults.length,
            totalPages: Math.ceil(sortedResults.length / params.limit),
            hasNextPage: params.page < Math.ceil(sortedResults.length / params.limit),
            hasPrevPage: params.page > 1,
          },
          currency: displayCurrency,
          converted: isAdminOrDev && (!params.licencee || params.licencee === 'all'),
          performance: { totalTime: duration },
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Internal server error';
        logRouteError(
          functionName,
          'GET',
          '/api/reports/locations',
          errorMessage,
          user
        );
        console.error('Reports Locations API Error:', err);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    }
  );
}
