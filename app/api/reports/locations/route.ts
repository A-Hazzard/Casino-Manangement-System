import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getMemberCountsPerLocation } from '@/app/api/lib/helpers/membershipAggregation';
import {
  applyLocationsCurrencyConversion,
  handleSummaryMode,
} from '@/app/api/lib/helpers/reports/locations';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import type { LocationDocument } from '@/lib/types/common';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { TimePeriod } from '@/app/api/lib/types';
import { getLicenceeCurrency } from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type { AggregatedLocation } from '@/shared/types/entities';
import { NextRequest, NextResponse } from 'next/server';
/**
 * Fetches the aggregated reporting data for gaming locations.
 * 
 * Supports various filters including licencee, time period, machine type, 
 * and search terms. Can return full aggregated metrics or a simplified 
 * summary for dropdowns/quick lists.
 * 
 * @param {NextRequest} req - The standard Next.js request object
 * @query {TimePeriod} [timePeriod='7d'] - Preset time range
 * @query {string} [licencee='all'] - ID of the licencee to filter by
 * @query {CurrencyCode} [currency='USD'] - Target currency for financial data
 * @query {string} [search] - Keyword to search by location name or ID
 * @query {string} [machineTypeFilter] - CSV of filters (LocalServersOnly, SMIBLocationsOnly, etc.)
 * @query {string} [onlineStatus='all'] - Connectivity filter (online, offline)
 * @query {string} [locations] - CSV of specific location IDs to include
 * @query {boolean} [showAllLocations=false] - Bypass pagination if true
 * @query {boolean} [archived=false] - Include deleted locations if true
 * @query {boolean} [summary=false] - Return only basic metadata for lists
 * @query {number} [page=1] - Pagination page number
 * @query {number} [limit=50] - Number of items per page
 * @query {string} [sortBy='gross'] - Field to sort results by
 * @query {string} [sortOrder='desc'] - Direction to sort ('asc' or 'desc')
 * @query {string} [startDate] - ISO start date for Custom timePeriod
 * @query {string} [endDate] - ISO end date for Custom timePeriod
 * 
 * @returns {NextResponse} JSON with data array, pagination metadata, and performance metrics
 */
export async function GET(req: NextRequest) {
  return withApiAuth(
    req,
    async ({ user: userPayload, userRoles, isAdminOrDev }) => {
      const perfStart = Date.now();

      try {
        // ============================================================================
        // STEP 1: Parse and validate request parameters
        // Example: GET /api/reports/locations?limit=1000&page=1&showAllLocations=true&summary=true&licencee=9a5db2cb29ffd2d962fd1d91&currency=TTD&timePeriod=Yesterday
        // ============================================================================
        const { searchParams } = new URL(req.url);
        const timePeriod =
          (searchParams.get('timePeriod') as TimePeriod) || '7d';
        const licencee = searchParams.get('licencee') || undefined;
        const currencyParam = searchParams.get(
          'currency'
        ) as CurrencyCode | null;
        let displayCurrency: CurrencyCode = currencyParam || 'USD';
        const searchTerm = searchParams.get('search')?.trim() || '';
        const machineTypeFilter = searchParams.get('machineTypeFilter');
        const onlineStatus =
          searchParams.get('onlineStatus')?.toLowerCase() || 'all';
        const specificLocations =
          searchParams.get('locations')?.split(',').filter(Boolean) || [];
        const showAllLocations =
          searchParams.get('showAllLocations') === 'true';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = showAllLocations
          ? 10000
          : Math.min(parseInt(searchParams.get('limit') || '50'), 50);
        const skip = showAllLocations ? 0 : (page - 1) * limit;
        const sortBy = searchParams.get('sortBy') || 'gross';
        const sortOrder =
          searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

        let customStartDate: Date | undefined, customEndDate: Date | undefined;
        if (timePeriod === 'Custom') {
          const start = searchParams.get('startDate');
          const end = searchParams.get('endDate');
          if (!start || !end)
            return NextResponse.json(
              { error: 'Missing dates' },
              { status: 400 }
            );
          customStartDate = new Date(start);
          customEndDate = new Date(end);
        }

        const userLocationPermissions =
          (userPayload as { assignedLocations?: string[] })
            ?.assignedLocations || [];
        const userAccessibleLicencees =
          await getUserAccessibleLicenceesFromToken();

        // ============================================================================
        // STEP 2: Determine accessible locations and display currency
        // ============================================================================
        let resolvedLicencee =
          licencee && licencee !== 'all' ? licencee : undefined;
        if (
          !resolvedLicencee &&
          userAccessibleLicencees !== 'all' &&
          userAccessibleLicencees.length === 1
        ) {
          resolvedLicencee = userAccessibleLicencees[0];
        }

        if (!currencyParam && resolvedLicencee) {
          const licenceeDoc = await Licencee.findOne(
            { _id: resolvedLicencee },
            { name: 1 }
          ).lean();
          if (licenceeDoc && !Array.isArray(licenceeDoc) && licenceeDoc.name) {
            displayCurrency = getLicenceeCurrency(licenceeDoc.name);
          }
        }

        const allowedLocationIds = await getUserLocationFilter(
          userAccessibleLicencees,
          licencee || undefined,
          userLocationPermissions,
          userRoles
        );

        // ============================================================================
        // STEP 3: Build location match filters
        // ============================================================================
        const showArchived = searchParams.get('archived') === 'true';
        const locationMatchStage: Record<string, unknown> = showArchived
          ? { deletedAt: { $gte: new Date('2025-01-01') } }
          : {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2025-01-01') } },
              ],
            };

        if (allowedLocationIds !== 'all') {
          if (allowedLocationIds.length === 0)
            return createEmptyResponse(page, limit, displayCurrency);
          let intersection = allowedLocationIds;
          if (specificLocations.length > 0) {
            intersection = allowedLocationIds.filter(id =>
              specificLocations.includes(String(id))
            );
            if (intersection.length === 0)
              return createEmptyResponse(page, limit, displayCurrency);
          }
          locationMatchStage._id = { $in: intersection };
        } else if (specificLocations.length > 0) {
          locationMatchStage._id = { $in: specificLocations };
        }

        if (licencee && licencee !== 'all') {
          if (!locationMatchStage.$and) locationMatchStage.$and = [];
          (locationMatchStage.$and as Array<Record<string, unknown>>).push({
            $or: [{ 'rel.licencee': licencee }],
          });
        }

        if (searchTerm) {
          const searchFilter = {
            $or: [
              { name: { $regex: searchTerm, $options: 'i' } },
              { _id: searchTerm },
            ],
          };
          if (
            locationMatchStage.$and &&
            Array.isArray(locationMatchStage.$and)
          ) {
            locationMatchStage.$and.push(searchFilter);
          } else {
            locationMatchStage.$and = [searchFilter];
          }
        }

        if (!isAdminOrDev) {
          const testFilter = { name: { $not: /^test/i } };
          if (
            locationMatchStage.$and &&
            Array.isArray(locationMatchStage.$and)
          ) {
            locationMatchStage.$and.push(testFilter);
          } else {
            locationMatchStage.$and = [testFilter];
          }
        }

        // Machine type filters (SMIB, No SMIB, Local Server, Membership, Coordinates)
        if (machineTypeFilter) {
          const filters = machineTypeFilter.split(',').filter(f => f.trim() !== '');

          const connectionFilters: Record<string, unknown>[] = [];
          const featureFilters: Record<string, unknown>[] = [];
          const qualityFilters: Record<string, unknown>[] = [];

          filters.forEach(filter => {
            const f = filter.trim();
            switch (f) {
              case 'LocalServersOnly':
                connectionFilters.push({ isLocalServer: true });
                break;
              case 'SMIBLocationsOnly':
                connectionFilters.push({ noSMIBLocation: { $ne: true } });
                break;
              case 'NoSMIBLocation':
                connectionFilters.push({ noSMIBLocation: true });
                break;
              case 'MembershipOnly':
                featureFilters.push({
                  $or: [{ membershipEnabled: true }, { enableMembership: true }],
                });
                break;
              case 'MissingCoordinates':
                qualityFilters.push({
                  $or: [
                    { geoCoords: { $exists: false } },
                    { geoCoords: null },
                    { 'geoCoords.latitude': { $exists: false } },
                    { 'geoCoords.latitude': null },
                    { 'geoCoords.latitude': 0 },
                    {
                      $or: [
                        { 'geoCoords.longitude': { $exists: false, $eq: null } },
                        { 'geoCoords.longtitude': { $exists: false, $eq: null } },
                      ],
                    },
                  ],
                });
                break;
              case 'HasCoordinates':
                qualityFilters.push({
                  $and: [
                    { 'geoCoords.latitude': { $exists: true, $nin: [null, 0] } },
                    {
                      $or: [
                        { 'geoCoords.longitude': { $exists: true, $nin: [null, 0] } },
                        { 'geoCoords.longtitude': { $exists: true, $nin: [null, 0] } },
                      ],
                    },
                  ],
                });
                break;
            }
          });

          if (!locationMatchStage.$and) locationMatchStage.$and = [];
          const andArray = locationMatchStage.$and as Array<Record<string, unknown>>;

          if (connectionFilters.length > 0)
            andArray.push({ $or: connectionFilters });
          if (featureFilters.length > 0)
            andArray.push({ $or: featureFilters });
          if (qualityFilters.length > 0)
            andArray.push({ $or: qualityFilters });
        }

        // ============================================================================
        // STEP 4: Fetch locations and calculate metrics
        // ============================================================================
        const locations = (await GamingLocations.find(
          locationMatchStage
        ).lean()) as unknown as LocationDocument[];

        if (searchParams.get('summary') === 'true') {
          return await handleSummaryMode(locations, displayCurrency, perfStart);
        }

        const allLocationIds = locations.map(loc => String(loc._id));
        
        // Machine query logic - apply same rule as machine list to ensure totals match
        const machineMatch: Record<string, unknown> = {
          gamingLocation: { $in: allLocationIds }
        };

        // Note: For locations report, we typically only show totals for Active machines 
        // unless viewing archived locations.
        if (!showArchived) {
          // Standard Active: null OR < 2025
          machineMatch.$or = [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ];
        } else {
          // Standard Archived: >= 2025
          machineMatch.deletedAt = { $gte: new Date('2025-01-01') };
        }

        const allMachinesData = await Machine.find(machineMatch).lean();
        const allMachineIds = allMachinesData.map(m => String(m._id));

        const locationToMachines = new Map<string, Record<string, unknown>[]>();
        allMachinesData.forEach(m => {
          const locId = String(m.gamingLocation!);
          if (!locationToMachines.has(locId)) locationToMachines.set(locId, []);
          locationToMachines.get(locId)!.push(m as Record<string, unknown>);
        });

        const locationRanges = getGamingDayRangesForLocations(
          locations.map(loc => ({
            _id: String(loc._id),
            gameDayOffset: loc.gameDayOffset ?? 8,
          })),
          timePeriod,
          customStartDate,
          customEndDate
        );

        let globalStart = new Date();
        let globalEnd = new Date(0);
        locationRanges.forEach(range => {
          if (range.rangeStart < globalStart) globalStart = range.rangeStart;
          if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
        });

        const metricsMap = new Map<
          string,
          {
            totalDrop: number;
            totalCancelledCredits: number;
            totalJackpot: number;
          }
        >();
        const metersCursor = Meters.aggregate([
          {
            $match: {
              location: { $in: allLocationIds },
              machine: { $in: allMachineIds },
              readAt: { $gte: globalStart, $lte: globalEnd },
            },
          },
          {
            $group: {
              _id: {
                machine: '$machine',
                location: '$location',
                hour: { $dateTrunc: { date: '$readAt', unit: 'hour' } },
              },
              totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              totalCancelledCredits: {
                $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
              },
              totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
            },
          },
        ])
          .allowDiskUse(true)
          .cursor({ batchSize: 1000 });

        for await (const doc of metersCursor) {
          const locId = String(doc._id.location);
          const bucketHour = new Date(doc._id.hour);
          const range = locationRanges.get(locId);
          if (
            range &&
            bucketHour >= range.rangeStart &&
            bucketHour <= range.rangeEnd
          ) {
            if (!metricsMap.has(locId))
              metricsMap.set(locId, {
                totalDrop: 0,
                totalCancelledCredits: 0,
                totalJackpot: 0,
              });
            const current = metricsMap.get(locId)!;
            current.totalDrop += doc.totalDrop || 0;
            current.totalCancelledCredits += doc.totalCancelledCredits || 0;
            current.totalJackpot += doc.totalJackpot || 0;
          }
        }

        const memberCountMap = await getMemberCountsPerLocation(allLocationIds);
        const licencees = await Licencee.find({
          _id: {
            $in: Array.from(
              new Set(locations.map(l => l.rel?.licencee).filter(Boolean))
            ),
          },
        }).lean();
        const licenceeIncludeJackpotMap = new Map(
          licencees.map(l => [String(l._id), !!l.includeJackpot])
        );

        const reviewerMult = (userPayload as { multiplier?: number | null })?.multiplier ?? null;

        const locationResults: AggregatedLocation[] = locations.map(loc => {
          const locId = String(loc._id);
          const machines = locationToMachines.get(locId) || [];
          const metrics = metricsMap.get(locId) || {
            totalDrop: 0,
            totalCancelledCredits: 0,
            totalJackpot: 0,
          };
          let scaledDrop = metrics.totalDrop || 0;
          let scaledCancelled = metrics.totalCancelledCredits || 0;
          let scaledJackpot = metrics.totalJackpot || 0;
          if (reviewerMult !== null) {
            const mult = 1 - reviewerMult;
            scaledDrop *= mult;
            scaledCancelled *= mult;
            scaledJackpot *= mult;
          }
          const includeJackpot =
            licenceeIncludeJackpotMap.get(String(loc.rel?.licencee)) || false;

          return {
            _id: locId,
            location: locId,
            locationName: loc.name,
            includeJackpot,
            moneyIn: Math.round(scaledDrop * 100) / 100,
            moneyOut:
              Math.round(
                (scaledCancelled + (includeJackpot ? scaledJackpot : 0)) * 100
              ) / 100,
            gross:
              Math.round(
                (scaledDrop - (scaledCancelled + (includeJackpot ? scaledJackpot : 0))) *
                  100
              ) / 100,
            jackpot: Math.round(scaledJackpot * 100) / 100,
            totalMachines: machines.length,
            onlineMachines: loc.aceEnabled
              ? machines.length
              : machines.filter(
                  m =>
                    (m.lastActivity
                      ? new Date(m.lastActivity as Date).getTime()
                      : 0) >
                    Date.now() - 3 * 60 * 1000
                ).length,
            sasMachines: machines.filter(m => m.isSasMachine).length,
            nonSasMachines: machines.filter(m => !m.isSasMachine).length,
            hasSasMachines: machines.some(m => m.isSasMachine),
            hasNonSasMachines: machines.some(m => !m.isSasMachine),
            noSMIBLocation:
              loc.noSMIBLocation ||
              !machines.some(
                m =>
                  (m.relayId as string)?.trim() ||
                  (m.smibBoard as string)?.trim()
              ),
            hasSmib: machines.some(
              m =>
                (m.relayId as string)?.trim() || (m.smibBoard as string)?.trim()
            ),
            rel: loc.rel,
            isLocalServer: Boolean(loc.isLocalServer),
            country: loc.country,
            geoCoords: loc.geoCoords,
            deletedAt: loc.deletedAt,
            membershipEnabled: !!(
              loc.membershipEnabled || loc.enableMembership
            ),
            memberCount: memberCountMap.get(locId) || 0,
            machines: machines.map(m => ({
              _id: String(m._id),
              assetNumber: m.assetNumber as string,
              serialNumber: m.serialNumber as string,
              isSasMachine: !!m.isSasMachine,
              lastActivity: m.lastActivity
                ? new Date(m.lastActivity as Date)
                : undefined,
            })),
            coinIn: 0,
            coinOut: 0,
            gamesPlayed: 0,
          } as AggregatedLocation;
        });

        // Filter and Sort results
        let filteredResults = locationResults;
        if (onlineStatus !== 'all') {
          filteredResults = locationResults.filter(loc => {
            const isOnline = loc.onlineMachines > 0;
            if (onlineStatus === 'online') return isOnline;
            if (onlineStatus.startsWith('offline'))
              return !isOnline && loc.totalMachines > 0;
            return true;
          });
        }

        filteredResults.sort((a, b) => {
          const valA = (a as unknown as Record<string, number>)[sortBy] ?? 0;
          const valB = (b as unknown as Record<string, number>)[sortBy] ?? 0;
          return sortOrder === 'asc'
            ? valA < valB
              ? -1
              : 1
            : valA > valB
              ? -1
              : 1;
        });

        const paginated = filteredResults.slice(skip, skip + limit);
        const converted = await applyLocationsCurrencyConversion(
          paginated,
          licencee,
          displayCurrency,
          isAdminOrDev
        );

        return NextResponse.json({
          data: converted,
          pagination: {
            page,
            limit,
            totalCount: filteredResults.length,
            totalPages: Math.ceil(filteredResults.length / limit),
            hasNextPage: page < Math.ceil(filteredResults.length / limit),
            hasPrevPage: page > 1,
          },
          currency: displayCurrency,
          converted: isAdminOrDev && (licencee === 'all' || !licencee),
          performance: { totalTime: Date.now() - perfStart },
        });
      } catch (err: unknown) {
        console.error('Reports Locations API Error:', err);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    }
  );
}

function createEmptyResponse(page: number, limit: number, currency: string) {
  return NextResponse.json({
    data: [],
    pagination: {
      page,
      limit,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    },
    currency,
    converted: false,
  });
}
