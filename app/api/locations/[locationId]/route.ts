/**
 * Location Detail API Route
 *
 * Multi-purpose endpoint for a single location. Behaviour changes based on which
 * query params are present. Used by the Location Details page, cabinet list, and
 * page header name lookups.
 *
 * URL params:
 * @param {string} locationId - Required (path). The `_id` of the location.
 *
 * Query params — mode selectors (mutually exclusive, checked in order):
 * @param {'true'} [nameOnly] - Returns only `{ _id, name, licenceeId, includeJackpot }`.
 * @param {'true'} [basicInfo] - Returns the full location document (no machines).
 *
 * Query params — cabinet list mode:
 * @param {TimePeriod} [timePeriod] - Required. Defines the aggregation window.
 * @param {string} [startDate] - Required when timePeriod='Custom'.
 * @param {string} [endDate] - Required when timePeriod='Custom'.
 * @param {string} [licencee] - Optional extra access guard.
 * @param {string} [search] - Filters cabinets by text match.
 * @param {'online'|'offline'|'never-online'|'all'} [onlineStatus] - Connectivity filter.
 * @param {'smib'|'no-smib'|'all'} [smibStatus] - SMIB board filter.
 * @param {'true'} [includeArchived] - Includes soft-deleted machines.
 * @param {number} [page] - Page number (default: 1).
 * @param {number} [limit] - Items per page (default: all).
 *
 * @module app/api/locations/[locationId]/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import {
  computeAndUpdateSmibTags,
  buildMachinesFilter,
  fetchMachineMetrics,
  buildMetricsMap,
  filterMachinesBySearch,
  mapMachinesToCabinetData,
  sortCabinetData,
  paginateAndTransformCabinets,
  fetchLicenceeJackpotFlag,
  computeReviewerScales,
} from '@/app/api/lib/helpers/locations/locationByIdOperations';
import type {
  CabinetItemData,
  CabinetMappingContext,
} from '@/app/api/lib/helpers/locations/locationByIdOperations';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import type { GamingMachine, LocationDocument } from '@shared/types';
import type { TimePeriod } from '@shared/types';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/locations/[locationId]
 *
 * Flow:
 * 1. Extract and validate location ID
 * 2. Handle nameOnly quick-lookup mode
 * 3. Authenticate user and verify location access + existence
 * 4. Run SMIB auto-tag (fire-and-forget with in-memory update)
 * 5. Handle basicInfo mode
 * 6. Parse cabinet-list params, compute gaming-day range, reviewer scales
 * 7. Build machine filter and fetch machines
 * 8. Search-filter, aggregate metrics, map to cabinet items
 * 9. Sort, paginate, transform to TransformedCabinet, respond
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/locations/[locationId]';
  const user = extractUserFromRequest(request);

  const { pathname } = request.nextUrl;
  const locationId = pathname.split('/').pop();

  if (!locationId) {
    logRouteError(functionName, 'GET', '/api/locations/[locationId]', 'Location ID required', user);
    return NextResponse.json(
      { success: false, message: 'Location ID required' },
      { status: 400 }
    );
  }

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Parse Query Params and Check Name-Only / Basic-Info Modes
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const nameOnly = searchParams.get('nameOnly') === 'true';
      const basicInfo = searchParams.get('basicInfo') === 'true';

      if (nameOnly) {
        const location = await GamingLocations.findOne(
          { _id: locationId },
          { _id: 1, name: 1, 'rel.licencee': 1 }
        ).lean<LocationDocument>();
        if (!location) {
          return NextResponse.json(
            { success: false, message: 'Not found' },
            { status: 404 }
          );
        }

        const licIdRaw = location.rel?.licencee || location.rel?.licencee;
        const licIdArr = licIdRaw
          ? Array.isArray(licIdRaw) ? licIdRaw : [licIdRaw]
          : [];
        const includeJackpot = licIdArr.length > 0
          ? await fetchLicenceeJackpotFlag(licIdArr[0])
          : false;

        logRouteFetch(functionName, 'GET', '/api/locations/[locationId]', 1, user, Date.now() - startTime);

        return NextResponse.json({
          success: true,
          location: {
            _id: location._id,
            name: location.name,
            licenceeId: licIdArr,
            includeJackpot,
          },
        });
      }

      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const isAdmin =
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('developer') ||
        normalizedRoles.includes('owner');
      if (!isAdmin && !(await checkUserLocationAccess(locationId))) {
        logRouteError(functionName, 'GET', '/api/locations/[locationId]', 'Unauthorized', user);
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 403 }
        );
      }

      const locationCheck = await GamingLocations.findOne({
        _id: locationId,
      }).lean<LocationDocument>();
      if (!locationCheck) {
        logRouteError(functionName, 'GET', '/api/locations/[locationId]', 'Not found', user);
        return NextResponse.json(
          { success: false, message: 'Not found' },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 2: SMIB Auto-Tag (fire-and-forget + in-memory injection)
      // ============================================================================
      {
        const smibTags = await computeAndUpdateSmibTags(locationId, locationCheck.name);
        (locationCheck as Record<string, unknown>).fullSMIBs = smibTags.fullSMIBs;
        (locationCheck as Record<string, unknown>).semiSMIBs = smibTags.semiSMIBs;
        (locationCheck as Record<string, unknown>).noSMIBLocation = smibTags.noSMIBLocation;
      }

      if (basicInfo || !searchParams.toString().length) {
        const includeJackpot = await fetchLicenceeJackpotFlag(locationCheck.rel?.licencee);
        logRouteFetch(functionName, 'GET', '/api/locations/[locationId]', 1, user, Date.now() - startTime);
        return NextResponse.json({
          success: true,
          location: { ...locationCheck, includeJackpot },
        });
      }

      // ============================================================================
      // STEP 3: Parse Cabinet-List Parameters
      // ============================================================================
      const licencee = searchParams.get('licencee');
      const searchTerm = searchParams.get('search');
      const timePeriod = searchParams.get('timePeriod') as TimePeriod;
      const customStart = searchParams.get('startDate');
      const customEnd = searchParams.get('endDate');
      const onlineStatus = searchParams.get('onlineStatus') || 'all';
      const smibStatus = (searchParams.get('smibStatus') || 'all').toLowerCase();
      const limitParam = searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam) : undefined;
      const page = parseInt(searchParams.get('page') || '1');
      const skip = limit ? (page - 1) * limit : 0;

      if (!timePeriod) {
        logRouteError(functionName, 'GET', '/api/locations/[locationId]', 'timePeriod required', user);
        return NextResponse.json({ error: 'timePeriod required' }, { status: 400 });
      }

      if (!isAdmin && licencee && licencee !== 'all') {
        const locLicId = locationCheck.rel?.licencee;
        if (
          locLicId !== licencee &&
          (!Array.isArray(locLicId) || !locLicId.includes(licencee))
        ) {
          logRouteError(functionName, 'GET', '/api/locations/[locationId]', 'Access denied', user);
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      const gameDayOffset = locationCheck.gameDayOffset ?? 8;
      const gdr = getGamingDayRangeForPeriod(
        timePeriod,
        gameDayOffset,
        customStart ? new Date(customStart) : undefined,
        customEnd ? new Date(customEnd) : undefined
      );

      const includeJackpotSetting = await fetchLicenceeJackpotFlag(locationCheck.rel?.licencee);
      const { moneyInScale, moneyOutScale } = computeReviewerScales(
        userPayload as {
          moneyInMultiplier?: number | null;
          moneyOutAndJackpotMultiplier?: number | null;
          roles?: string[];
          reviewerMultiplierStartTime?: Date | string | null;
        },
        gdr.rangeEnd
      );

      // ============================================================================
      // STEP 4: Build Machine Filter and Fetch Machines
      // ============================================================================
      const includeArchived = searchParams.get('includeArchived') === 'true';
      const mMatch = buildMachinesFilter({
        locationId,
        includeArchived,
        onlineStatus,
        smibStatus,
        aceEnabled: !!locationCheck.aceEnabled,
      });

      const machines = await Machine.find(mMatch, {
        _id: 1,
        serialNumber: 1,
        relayId: 1,
        smibBoard: 1,
        'custom.name': 1,
        lastActivity: 1,
        game: 1,
        manufacturer: 1,
        manuf: 1,
        cabinetType: 1,
        gameType: 1,
        isCronosMachine: 1,
        sasMeters: 1,
        assetStatus: 1,
        deletedAt: 1,
        'meta.dataSync.source': 1,
      }).lean<GamingMachine[]>();

      if (!machines.length) {
        logRouteFetch(functionName, 'GET', '/api/locations/[locationId]', 0, user, Date.now() - startTime);
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: limit || 0,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
      }

      // ============================================================================
      // STEP 5: Search Filter, Aggregate Metrics, Map to Cabinet Items
      // ============================================================================
      const filteredMachines = searchTerm
        ? filterMachinesBySearch(machines, searchTerm)
        : machines;

      const filteredMachineIds = filteredMachines.map(m => String(m._id));
      const metricsRecords = await fetchMachineMetrics(
        locationId,
        filteredMachineIds,
        gdr.rangeStart,
        gdr.rangeEnd
      );
      const metricsMap = buildMetricsMap(metricsRecords);

      const mappingContext: CabinetMappingContext = {
        locationId,
        locationName: locationCheck.name || 'Location',
        aceEnabled: !!locationCheck.aceEnabled,
        moneyInScale,
        moneyOutScale,
        includeJackpotSetting,
      };
      const cabinetItems: CabinetItemData[] = mapMachinesToCabinetData(
        filteredMachines,
        metricsMap,
        mappingContext
      );

      // ============================================================================
      // STEP 6: Sort, Paginate, Transform, Respond
      // ============================================================================
      sortCabinetData(cabinetItems, searchTerm || undefined);
      const result = paginateAndTransformCabinets(cabinetItems, page, limit, skip);

      logRouteFetch(functionName, 'GET', '/api/locations/[locationId]', result.data.length, user, Date.now() - startTime);

      return NextResponse.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logRouteError(functionName, 'GET', '/api/locations/[locationId]', message, user);
      console.error('[Location Detail API] Error:', error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
