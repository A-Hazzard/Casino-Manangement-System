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
 *
 * @module app/api/locations/search-all/route
 */

import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getMemberCountsPerLocation } from '@/app/api/lib/helpers/membershipAggregation';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD, convertToUSD } from '@/lib/helpers/rates';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import {
  getMoneyInScale,
  getMoneyOutAndJackpotScale,
} from '@/app/api/lib/utils/reviewerScale';
import {
  fetchLocationsWithMachinesForSmib,
  syncAllLocationSmibStatuses,
} from '@/app/api/lib/helpers/smibClassification';
import { NextRequest, NextResponse } from 'next/server';
import {
  AggregatedLocation,
  CountryDocument,
  GamingMachine,
  LicenceeDocument,
  TimePeriod,
} from '../../../../shared/types';
import { CurrencyCode } from '../../../../shared/types/currency';

/**
 * Main GET handler for searching all locations
 *
 * @param {string} licencee - Filter locations by licencee name
 * @param {string} search - Search query for name or ID
 * @param {string} currency - Target currency code for financial values
 * @param {string} timePeriod - Time range for metrics ('30d' default)
 * @param {string} startDate - ISO date for custom range start
 * @param {string} endDate - ISO date for custom range end
 * @param {string} machineTypeFilter - Filter locations by machine capabilities
 * @param {string} onlineStatus - Filter by connectivity status
 *
 * Flow:
 * 1. Parse query parameters (licencee, search, currency)
 * 2. Connect to database
 * 3. Get user's accessible licencees and permissions
 * 4. Apply location filtering based on permissions
 * 5. Build location match filter
 * 6. Fetch locations with aggregation (machines, financial data)
 * 7. Apply currency conversion if needed
 * 8. Return formatted location data
 */
export async function GET(request: NextRequest) {
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
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '30d';
    const customStartDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const customEndDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const machineTypeFilter = searchParams.get('machineTypeFilter');
    const onlineStatus =
      searchParams.get('onlineStatus')?.toLowerCase() || 'all';
    const showArchived =
      searchParams.get('archived') === 'true' ||
      searchParams.get('includeDeleted') === 'true';
    const syncAll = searchParams.get('syncAll') === 'true';

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'DB connection failed' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Get user's accessible licencees and permissions
    // ============================================================================
    const userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    // Use only new field
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }

    // ============================================================================
    // STEP 4: Apply location filtering based on permissions
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicencees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 5: Build location match filter
    // ============================================================================
    const deletionFilter = showArchived
      ? { deletedAt: { $gte: new Date('2025-01-01') } }
      : {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        };

    const locationMatch: {
      $and: Array<Record<string, unknown>>;
      [key: string]: unknown;
    } = {
      $and: [deletionFilter],
    };

    if (search) {
      // Check if search looks like an _id (MongoDB ObjectId format or string ID)
      const isObjectIdFormat = /^[0-9a-fA-F]{24}$/.test(search.trim());
      if (isObjectIdFormat) {
        // Try to match _id first, then fall back to name search
        locationMatch.$and.push({
          $or: [
            { _id: search.trim() },
            { name: { $regex: search, $options: 'i' } },
          ],
        });
      } else {
        // Regular search - match name or _id (partial match)
        locationMatch.$and.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { _id: { $regex: search, $options: 'i' } },
          ],
        });
      }
    }
    if (licencee) {
      locationMatch.$and.push({
        $or: [{ 'rel.licencee': licencee }, { 'rel.licencee': licencee }],
      });
    }

    // Apply user location permissions filter
    if (allowedLocationIds !== 'all') {
      if (allowedLocationIds.length === 0) {
        // No accessible locations - return empty array
        return NextResponse.json([]);
      }
      locationMatch.$and.push({ _id: { $in: allowedLocationIds } });
    }

    // Apply machine type filters (SMIB, No SMIB, Local Server, Membership, Coordinates)
    if (machineTypeFilter) {
      const filters = machineTypeFilter.split(',').filter(f => f.trim() !== '');

      // Group filters by logical categories to allow OR within category and AND across
      const connectionFilters: Record<string, unknown>[] = [];
      const featureFilters: Record<string, unknown>[] = [];
      const qualityFilters: Record<string, unknown>[] = [];

      filters.forEach(filter => {
        const filterItem = filter.trim();
        switch (filterItem) {
          // --- Connection Category ---
          case 'LocalServersOnly':
            connectionFilters.push({ isLocalServer: true });
            break;
          case 'SMIBLocationsOnly':
            connectionFilters.push({ noSMIBLocation: { $ne: true } });
            break;
          case 'NoSMIBLocation':
            connectionFilters.push({ noSMIBLocation: true });
            break;
          case 'FullSMIBs':
            connectionFilters.push({ fullSMIBs: true });
            break;
          case 'SemiSMIBs':
            connectionFilters.push({ semiSMIBs: true });
            break;

          // --- Feature Category ---
          case 'MembershipOnly':
            featureFilters.push({
              $or: [{ membershipEnabled: true }, { enableMembership: true }],
            });
            break;

          // --- Quality Category ---
          // A location HAS coordinates if ANY of: googleMapsIframe, googleMapsLink, or valid geoCoords is present.
          // It is MISSING coordinates only when ALL are absent.
          case 'MissingCoordinates':
            qualityFilters.push({
              $and: [
                {
                  $or: [
                    { googleMapsIframe: { $exists: false } },
                    { googleMapsIframe: null },
                    { googleMapsIframe: '' },
                  ],
                },
                {
                  $or: [
                    { googleMapsLink: { $exists: false } },
                    { googleMapsLink: null },
                    { googleMapsLink: '' },
                  ],
                },
                {
                  $and: [
                    {
                      $or: [
                        { 'geoCoords.latitude': { $exists: false } },
                        { 'geoCoords.latitude': null },
                        { 'geoCoords.latitude': { $in: [0, '0', '0.0', ''] } },
                        { 'geoCoords.latitude': { $type: 'string' } },
                      ],
                    },
                    {
                      $or: [
                        { 'geoCoords.longitude': { $exists: false } },
                        { 'geoCoords.longitude': null },
                        { 'geoCoords.longitude': { $in: [0, '0', '0.0', ''] } },
                        { 'geoCoords.longitude': { $type: 'string' } },
                      ],
                    },
                    {
                      $or: [
                        { 'geoCoords.longtitude': { $exists: false } },
                        { 'geoCoords.longtitude': null },
                        {
                          'geoCoords.longtitude': { $in: [0, '0', '0.0', ''] },
                        },
                        { 'geoCoords.longtitude': { $type: 'string' } },
                      ],
                    },
                  ],
                },
              ],
            });
            break;
          case 'HasCoordinates':
            qualityFilters.push({
              $or: [
                { googleMapsIframe: { $exists: true, $nin: [null, ''] } },
                { googleMapsLink: { $exists: true, $nin: [null, ''] } },
                {
                  'geoCoords.latitude': {
                    $exists: true,
                    $nin: [null, 0, '0', '0.0', ''],
                    $not: { $type: 'string' },
                  },
                },
                {
                  'geoCoords.longitude': {
                    $exists: true,
                    $nin: [null, 0, '0', '0.0', ''],
                    $not: { $type: 'string' },
                  },
                },
                {
                  'geoCoords.longtitude': {
                    $exists: true,
                    $nin: [null, 0, '0', '0.0', ''],
                    $not: { $type: 'string' },
                  },
                },
              ],
            });
            break;
        }
      });

      // Combine categories: (Conn1 OR Conn2) AND (Feat1) AND (Qual1 OR Qual2)
      const combinedFilters: Record<string, unknown>[] = [];
      if (connectionFilters.length > 0)
        combinedFilters.push({ $or: connectionFilters });
      if (featureFilters.length > 0)
        combinedFilters.push({ $or: featureFilters });
      if (qualityFilters.length > 0)
        combinedFilters.push({ $or: qualityFilters });

      if (combinedFilters.length > 0) {
        combinedFilters.forEach(filter => {
          locationMatch.$and.push(filter);
        });
      }
    }

    // ============================================================================
    // STEP 6: Fetch locations with aggregation (machines, financial data)
    // ============================================================================
    // First, get matching locations
    const matchingLocations = await GamingLocations.aggregate([
      { $match: locationMatch },
      {
        $lookup: {
          from: 'machines',
          let: { id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $eq: [
                        { $toString: '$gamingLocation' },
                        { $toString: '$$id' },
                      ],
                    },
                    { $eq: ['$gamingLocation', '$$id'] },
                  ],
                },
                ...(showArchived
                  ? { deletedAt: { $gte: new Date('2025-01-01') } }
                  : {
                      $or: [
                        { deletedAt: null },
                        { deletedAt: { $lt: new Date('2025-01-01') } },
                      ],
                    }),
              },
            },
            {
              $group: {
                _id: null,
                totalMachines: { $sum: 1 },
                withRelayCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ifNull: ['$relayId', false] },
                          {
                            $ne: [
                              {
                                $trim: {
                                  input: {
                                    $toString: { $ifNull: ['$relayId', ''] },
                                  },
                                },
                              },
                              '',
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                onlineMachines: {
                  $sum: {
                    $cond: [
                      {
                        $gte: [
                          {
                            $convert: {
                              input: '$lastActivity',
                              to: 'date',
                              onError: new Date(0),
                            },
                          },
                          new Date(Date.now() - 3 * 60 * 1000), // 3 minutes threshold
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                hasActivityCount: {
                  $sum: {
                    $cond: [{ $ifNull: ['$lastActivity', false] }, 1, 0],
                  },
                },
                latestActivity: { $max: '$lastActivity' },
              },
            },
          ],
          as: 'machineStats',
        },
      },
    ]).exec();

    // ============================================================================
    // OPTIMIZED: Calculate financial metrics using batch queries instead of N+1
    // ============================================================================
    // Step 1: Calculate gaming day ranges for all locations
    const gamingDayRanges = new Map<
      string,
      { rangeStart: Date; rangeEnd: Date; gameDayOffset: number }
    >();
    matchingLocations.forEach(location => {
      const locationId = String(location._id);
      const gameDayOffset = location.gameDayOffset ?? 8;
      const gamingDayRange = getGamingDayRangeForPeriod(
        timePeriod,
        gameDayOffset,
        customStartDate,
        customEndDate
      );
      gamingDayRanges.set(locationId, {
        ...gamingDayRange,
        gameDayOffset,
      });
    });

    // Step 2: Get global date range for initial meter query
    let globalStart = new Date();
    let globalEnd = new Date(0);
    gamingDayRanges.forEach(range => {
      if (range.rangeStart < globalStart) globalStart = range.rangeStart;
      if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
    });

    // Step 3: Get ALL location IDs
    const allLocationIds = matchingLocations.map(loc => {
      // Ensure we get the string representation of the ID, handling both String and ObjectId
      const id = loc._id;
      return typeof id === 'object' && id !== null && 'toString' in id
        ? id.toString()
        : String(id);
    });

    // Step 4: Get ALL machines for ALL locations in one query
    const allMachines = await Machine.find(
      {
        $and: [
          {
            $or: [
              { gamingLocation: { $in: allLocationIds } },
              { gamingLocation: { $in: matchingLocations.map(l => l._id) } },
            ],
          },
          ...(showArchived
            ? [{ deletedAt: { $gte: new Date('2025-01-01') } }]
            : [
                {
                  $or: [
                    { deletedAt: null },
                    { deletedAt: { $lt: new Date('2025-01-01') } },
                  ],
                },
              ]),
        ],
      },
      { _id: 1, gamingLocation: 1, lastActivity: 1, isSasMachine: 1 }
    )
      .lean<GamingMachine[]>()
      .exec();

    // Step 5: Group machines by location
    const machinesByLocation = new Map<string, string[]>();
    allMachines.forEach(machine => {
      const locationId = machine.gamingLocation
        ? String(machine.gamingLocation)
        : null;
      if (locationId && allLocationIds.includes(locationId)) {
        if (!machinesByLocation.has(locationId)) {
          machinesByLocation.set(locationId, []);
        }
        machinesByLocation.get(locationId)!.push(String(machine._id));
      }
    });

    // Step 6: Get ALL meters for ALL locations
    const metersByLocation = new Map<
      string,
      { totalMoneyIn: number; totalMoneyOut: number; totalJackpot: number }
    >();

    if (allLocationIds.length > 0) {
      const allMachineIds = allMachines.map(m => String(m._id));
      // Use aggregation to group by location AND hour to avoid inflation
      const cursor = Meters.aggregate([
        {
          $match: {
            location: { $in: allLocationIds },
            machine: { $in: allMachineIds },
            readAt: {
              $gte: globalStart,
              $lte: globalEnd,
            },
          },
        },
        {
          $group: {
            _id: {
              location: '$location',
              // Truncate to hour for bucketed summation
              hour: { $dateTrunc: { date: '$readAt', unit: 'hour' } },
            },
            totalMoneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalMoneyOut: {
              $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
            },
            totalJackpot: {
              $sum: { $ifNull: ['$movement.jackpot', 0] },
            },
          },
        },
      ]).cursor({ batchSize: 1000 });

      for await (const doc of cursor) {
        const locationId = String(doc._id.location);
        const bucketHour = new Date(doc._id.hour);
        const gamingDayRange = gamingDayRanges.get(locationId);

        if (!gamingDayRange) continue;

        // Only include buckets that are within this location's specific gaming day range
        const isWithinRange =
          bucketHour >= gamingDayRange.rangeStart &&
          bucketHour <= gamingDayRange.rangeEnd;

        if (isWithinRange) {
          if (!metersByLocation.has(locationId)) {
            metersByLocation.set(locationId, {
              totalMoneyIn: 0,
              totalMoneyOut: 0,
              totalJackpot: 0,
            });
          }
          const current = metersByLocation.get(locationId)!;
          current.totalMoneyIn += (doc.totalMoneyIn as number) || 0;
          current.totalMoneyOut += (doc.totalMoneyOut as number) || 0;
          current.totalJackpot += (doc.totalJackpot as number) || 0;
        }
      }
    }

    const memberCountMap = await getMemberCountsPerLocation(allLocationIds);

    // Fetch licencee settings for all locations
    const licenceeIds = Array.from(
      new Set(matchingLocations.map(loc => loc.rel?.licencee).filter(Boolean))
    );
    const licencees = await Licencee.find({ _id: { $in: licenceeIds } }).lean<
      LicenceeDocument[]
    >();
    const licenceeIncludeJackpotMap = new Map(
      licencees.map(l => [String(l._id), !!l.includeJackpot])
    );

    // Step 8: Combine results and create the initial AggregatedLocation objects
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

    // If syncAll requested, sync SMIB status first
    if (syncAll && allLocationIds.length > 0) {
      console.log(
        `[Locations Search-All] syncAll=true - syncing SMIB for ${allLocationIds.length} locations`
      );
      const locationsWithMachines =
        await fetchLocationsWithMachinesForSmib(allLocationIds);
      await syncAllLocationSmibStatuses(locationsWithMachines);
    }

    const locations: AggregatedLocation[] = matchingLocations.map(location => {
      const locationId = String(location._id);
      const financialData = metersByLocation.get(locationId) || {
        totalMoneyIn: 0,
        totalMoneyOut: 0,
        totalJackpot: 0,
      };

      const membershipEnabled = Boolean(
        location.membershipEnabled ||
        (location as { enableMembership?: boolean }).enableMembership
      );

      const includeJackpot =
        licenceeIncludeJackpotMap.get(String(location.rel?.licencee)) || false;
      const rawMoneyIn = (financialData.totalMoneyIn || 0) * moneyInScale;
      const rawMoneyOut = (financialData.totalMoneyOut || 0) * moneyOutScale;
      const jackpot = (financialData.totalJackpot || 0) * moneyOutScale;

      // Logic: TRUE = Low Gross (Include jackpot in deduction), FALSE = High Gross (Exclude jackpot from deduction)
      // rawMoneyOut is totalCancelledCredits which is typically NET handpays.
      const moneyOutValue = rawMoneyOut + (includeJackpot ? jackpot : 0);

      const machineCount = location.machineStats?.[0]?.totalMachines || 0;
      const withRelay =
        (location.machineStats?.[0] as { withRelayCount?: number })
          ?.withRelayCount || 0;
      // Use cached DB values if syncAll was run, otherwise compute from aggregation
      const useCached =
        syncAll &&
        (location.fullSMIBs !== undefined || location.semiSMIBs !== undefined);
      const cachedFull = useCached
        ? Boolean(location.fullSMIBs)
        : machineCount > 0 && withRelay === machineCount;
      const cachedSemi = useCached
        ? Boolean(location.semiSMIBs)
        : machineCount > 0 && withRelay > 0 && withRelay < machineCount;
      const computedFull = cachedFull;
      const computedSemiVal = cachedSemi;
      const computedNone = !computedFull && !computedSemiVal;

      return {
        _id: locationId,
        location: locationId,
        locationName: location.name,
        name: location.name,
        address: location.address,
        country: location.country,
        rel: location.rel,
        profitShare: location.profitShare,
        geoCoords: location.geoCoords,
        totalMachines: machineCount,
        onlineMachines: location.aceEnabled
          ? machineCount
          : location.machineStats?.[0]?.onlineMachines || 0,
        aceEnabled: location.aceEnabled || false,
        moneyIn: rawMoneyIn,
        moneyOut: moneyOutValue,
        jackpot: jackpot,
        includeJackpot: includeJackpot,
        gross: rawMoneyIn - moneyOutValue,
        isLocalServer: location.isLocalServer || false,
        hasSmib: computedFull || computedSemiVal,
        noSMIBLocation: computedNone,
        fullSMIBs: computedFull,
        semiSMIBs: computedSemiVal,
        membershipEnabled,
        memberCount: memberCountMap.get(locationId) || 0,
        isNeverOnline:
          machineCount > 0 &&
          (location.machineStats?.[0]?.hasActivityCount || 0) === 0,
        latestActivity: location.machineStats?.[0]?.latestActivity
          ? new Date(location.machineStats[0].latestActivity).getTime()
          : 0,
        googleMapsLink: location.googleMapsLink || '',
        googleMapsIframe: location.googleMapsIframe || '',
      };
    });

    // Apply online status filter to results if a specific status is selected
    let finalFilteredLocations = locations;
    if (onlineStatus !== 'all') {
      finalFilteredLocations = locations.filter(loc => {
        const isOnline = loc.onlineMachines > 0 || loc.aceEnabled;

        if (onlineStatus === 'online') {
          return isOnline;
        }

        if (onlineStatus.startsWith('offline')) {
          // Offline means either 0 online machines or last activity was long ago
          return !isOnline && loc.totalMachines > 0;
        }

        if (onlineStatus === 'neveronline') {
          return loc.isNeverOnline;
        }

        return true;
      });
    }

    // Handle Offline sorting if specified
    if (
      onlineStatus === 'offlinelongest' ||
      onlineStatus === 'offlineshortest'
    ) {
      finalFilteredLocations.sort((a, b) => {
        const activityA = a.latestActivity || 0;
        const activityB = b.latestActivity || 0;

        return onlineStatus === 'offlinelongest'
          ? activityA - activityB
          : activityB - activityA;
      });
    }

    // ============================================================================
    // STEP 7: Apply currency conversion if needed
    // ============================================================================
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const isAdminOrDev =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer') ||
      currentUserRoles.includes('owner');

    // Apply currency conversion ONLY for Admin/Developer viewing "All Licencees"
    let convertedLocations = finalFilteredLocations;
    if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
      // Get licencee details for currency mapping
      const licenceesData = await Licencee.find(
        {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lte: new Date('1971-01-01') } },
          ],
        },
        { _id: 1, name: 1 }
      )
        .lean<LicenceeDocument[]>()
        .exec();

      // Create a map of licencee ID to name
      const licenceeIdToName = new Map<string, string>();
      licenceesData.forEach((lic: { _id?: unknown; name?: string }) => {
        if (lic._id && lic.name) {
          licenceeIdToName.set(String(lic._id), lic.name);
        }
      });

      // Get country details for currency mapping (for unassigned locations)
      const { getCountryCurrency } = await import('@/lib/helpers/rates');
      const countriesData = await Countries.find({}).lean<CountryDocument[]>();

      // Create a map of country ID to name
      const countryIdToName = new Map<string, string>();
      countriesData.forEach((country: { _id?: unknown; name?: string }) => {
        if (country._id && country.name) {
          countryIdToName.set(String(country._id), country.name);
        }
      });

      // Convert each location's financial data
      convertedLocations = finalFilteredLocations.map(loc => {
        const licenceeId = loc.rel?.licencee as string | undefined;

        if (!licenceeId) {
          // Unassigned locations - determine currency from country
          const countryId = loc.country as string | undefined;
          const countryName = countryId
            ? countryIdToName.get(countryId.toString())
            : undefined;
          const nativeCurrency = countryName
            ? getCountryCurrency(countryName)
            : 'USD';

          // Convert from country's native currency to display currency
          const moneyInUSD = convertToUSD(loc.moneyIn, nativeCurrency);
          const moneyOutUSD = convertToUSD(loc.moneyOut, nativeCurrency);
          const grossUSD = convertToUSD(loc.gross, nativeCurrency);

          return {
            ...loc,
            moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
            moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
            gross: convertFromUSD(grossUSD, displayCurrency),
          };
        }

        const licenceeName =
          licenceeIdToName.get(licenceeId.toString()) || 'Unknown';

        // Convert from licencee's native currency to USD, then to display currency
        const moneyInUSD = convertToUSD(loc.moneyIn, licenceeName);
        const moneyOutUSD = convertToUSD(loc.moneyOut, licenceeName);
        const jackpotUSD = convertToUSD(loc.jackpot, licenceeName);
        const grossUSD = convertToUSD(loc.gross, licenceeName);

        return {
          ...loc,
          moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
          moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
          jackpot: convertFromUSD(jackpotUSD, displayCurrency),
          gross: convertFromUSD(grossUSD, displayCurrency),
        };
      });
    }

    // ============================================================================
    // STEP 8: Return formatted location data
    // ============================================================================
    // Step 9: Return final results with unified property mapping
    const finalResponse = convertedLocations.map(loc => ({
      _id: loc._id,
      location: loc._id,
      locationName: loc.name || 'Unknown Location',
      country: loc.country,
      address: loc.address,
      rel: loc.rel,
      profitShare: loc.profitShare,
      geoCoords: loc.geoCoords,
      totalMachines: loc.totalMachines,
      onlineMachines: loc.onlineMachines,
      moneyIn: loc.moneyIn,
      moneyOut: loc.moneyOut,
      jackpot: loc.jackpot,
      includeJackpot: loc.includeJackpot,
      gross: loc.gross,
      isLocalServer: loc.isLocalServer,
      hasSmib: loc.hasSmib,
      noSMIBLocation: loc.noSMIBLocation,
      fullSMIBs: loc.fullSMIBs,
      semiSMIBs: loc.semiSMIBs,
      membershipEnabled: loc.membershipEnabled,
      memberCount: loc.memberCount,
      aceEnabled: loc.aceEnabled,
      isNeverOnline: loc.isNeverOnline,
      latestActivity: loc.latestActivity,
      googleMapsLink: loc.googleMapsLink,
      googleMapsIframe: loc.googleMapsIframe,
    }));

    // ============================================================================
    // STEP 9: Final Sorting
    // Priority: Search Relevance (if searching) -> Online Status -> Most Gross
    // ============================================================================
    finalResponse.sort((a, b) => {
      // 1. Search Relevance (Prefix match ranks highest)
      if (search) {
        const searchLower = search.toLowerCase();
        const aName = a.locationName.toLowerCase();
        const bName = b.locationName.toLowerCase();
        const aStarts = aName.startsWith(searchLower);
        const bStarts = bName.startsWith(searchLower);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }

      // 2. Connectivity (Online first)
      const aOnline = a.onlineMachines > 0 || a.aceEnabled;
      const bOnline = b.onlineMachines > 0 || b.aceEnabled;
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      // 3. Gross (Descending)
      const bGross = b.gross || 0;
      const aGross = a.gross || 0;
      if (bGross !== aGross) return bGross - aGross;

      // 4. Alphabetical fallback
      return a.locationName.localeCompare(b.locationName);
    });

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/locations/search-all',
      finalResponse.length,
      user,
      duration
    );

    if (duration > 2000) {
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
}
