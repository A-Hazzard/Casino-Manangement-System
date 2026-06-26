/**
 * Search All Locations Operations
 *
 * Business logic for searching all locations with financial metrics, currency conversion,
 * machine type filtering, and online status filtering.
 * Extracted from the search-all route to keep handlers lean.
 *
 * @module app/api/lib/helpers/locations/searchOperations
 */

import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Meters } from '@/app/api/lib/models/meters';
import { getMemberCountsPerLocation } from '@/app/api/lib/helpers/membershipAggregation';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD, convertToUSD, getCountryCurrency } from '@/lib/helpers/rates';
import type { CountryDocument, LicenceeDocument, TimePeriod } from '@/shared/types';
import type { CurrencyCode } from '@/shared/types/currency';

// ============================================================================
// Types
// ============================================================================

type LocationRecord = Record<string, unknown>;

type MetersByLocation = Map<string, { totalMoneyIn: number; totalMoneyOut: number; totalJackpot: number }>;

export type LocationResult = {
  _id: string;
  location: string;
  locationName: string;
  name: string;
  address: unknown;
  country: unknown;
  rel: unknown;
  profitShare: unknown;
  geoCoords: unknown;
  totalMachines: number;
  onlineMachines: number;
  aceEnabled: boolean;
  moneyIn: number;
  moneyOut: number;
  jackpot: number;
  includeJackpot: boolean;
  gross: number;
  isLocalServer: boolean;
  hasSmib: boolean;
  noSMIBLocation: boolean;
  fullSMIBs: boolean;
  semiSMIBs: boolean;
  membershipEnabled: boolean;
  memberCount: number;
  isNeverOnline: boolean;
  latestActivity: number;
  googleMapsLink: string;
  googleMapsIframe: string;
};

type MachineStatsDoc = {
  totalMachines: number;
  withRelayCount: number;
  onlineMachines: number;
  hasActivityCount: number;
  latestActivity: Date | null;
};

type MachineTypeFilterBuilders = {
  connectionFilters: Record<string, unknown>[];
  featureFilters: Record<string, unknown>[];
  qualityFilters: Record<string, unknown>[];
};

// ============================================================================
// Constants
// ============================================================================

const DELETION_SOFT_CUTOFF = new Date('2025-01-01');

// ============================================================================
// 1. Build Location Match Filter
// ============================================================================

/**
 * Builds the MongoDB $match filter for location search.
 * Combines deletion filter, search query, licencee filter, location permissions,
 * and machine type filters.
 *
 * @param {Object} params - Filter parameters
 * @param {boolean} params.showArchived - Include archived (soft-deleted) locations
 * @param {string} params.search - Search query for name or ID
 * @param {string} params.licencee - Licencee ID filter
 * @param {string[] | 'all'} params.allowedLocationIds - User's accessible location IDs
 * @param {string | null} params.machineTypeFilter - Comma-separated machine type filters
 * @returns {{ $and: Array<Record<string, unknown>> }} MongoDB match filter
 */
export function buildLocationSearchFilter(params: {
  showArchived: boolean;
  search: string;
  licencee: string;
  allowedLocationIds: string[] | 'all';
  machineTypeFilter: string | null;
  wowLocationIds?: string[] | null;
}): { $and: Array<Record<string, unknown>> } {
  const deletionFilter = params.showArchived
    ? { deletedAt: { $gte: DELETION_SOFT_CUTOFF } }
    : {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: DELETION_SOFT_CUTOFF } },
        ],
      };

  const locationMatch: { $and: Array<Record<string, unknown>>; [key: string]: unknown } = {
    $and: [deletionFilter],
  };

  if (params.search) {
    const trimmedSearch = params.search.trim();
    const isObjectIdFormat = /^[0-9a-fA-F]{24}$/.test(trimmedSearch);
    if (isObjectIdFormat) {
      locationMatch.$and.push({
        $or: [
          { _id: trimmedSearch },
          { name: { $regex: params.search, $options: 'i' } },
        ],
      });
    } else {
      locationMatch.$and.push({
        $or: [
          { name: { $regex: params.search, $options: 'i' } },
          { _id: { $regex: params.search, $options: 'i' } },
        ],
      });
    }
  }

  if (params.licencee) {
    locationMatch.$and.push({
      $or: [{ 'rel.licencee': params.licencee }, { 'rel.licencee': params.licencee }],
    });
  }

  if (params.allowedLocationIds !== 'all') {
    locationMatch.$and.push({ _id: { $in: params.allowedLocationIds } });
  }

  if (params.machineTypeFilter) {
    const filterConditions = buildMachineTypeFilterConditions(params.machineTypeFilter);
    if (filterConditions.length > 0) {
      filterConditions.forEach(filterCondition => {
        locationMatch.$and.push(filterCondition);
      });
    }

    // WOW filter has no persisted location flag — restrict to precomputed IDs.
    const hasWowFilter = params.machineTypeFilter
      .split(',')
      .some(type => type.trim() === 'WowOnly');
    if (hasWowFilter) {
      locationMatch.$and.push({ _id: { $in: params.wowLocationIds ?? [] } });
    }
  }

  return locationMatch;
}

// ============================================================================
// 2. Build Machine Type Filter Conditions
// ============================================================================

/**
 * Parses a comma-separated machine type filter string into MongoDB conditions.
 * Groups filters by category (connection, feature, quality) with OR within
 * each category and AND across categories.
 *
 * @param {string} machineTypeFilter - Comma-separated filter values
 * @returns {Array<Record<string, unknown>>} Combined MongoDB filter conditions
 */
function buildMachineTypeFilterConditions(machineTypeFilter: string): Array<Record<string, unknown>> {
  const filters = machineTypeFilter.split(',').filter(filterPart => filterPart.trim() !== '');
  const builders: MachineTypeFilterBuilders = {
    connectionFilters: [],
    featureFilters: [],
    qualityFilters: [],
  };

  filters.forEach(filterPart => {
    const filterItem = filterPart.trim();
    switch (filterItem) {
      // --- Connection Category ---
      case 'LocalServersOnly':
        builders.connectionFilters.push({ isLocalServer: true });
        break;
      case 'SMIBLocationsOnly':
        builders.connectionFilters.push({ noSMIBLocation: { $ne: true } });
        break;
      case 'NoSMIBLocation':
        builders.connectionFilters.push({ noSMIBLocation: true });
        break;
      case 'FullSMIBs':
        builders.connectionFilters.push({ fullSMIBs: true });
        break;
      case 'SemiSMIBs':
        builders.connectionFilters.push({ semiSMIBs: true });
        break;

      // --- Feature Category ---
      case 'MembershipOnly':
        builders.featureFilters.push({
          $or: [{ membershipEnabled: true }, { enableMembership: true }],
        });
        break;

      // --- Quality Category ---
      case 'MissingCoordinates':
        builders.qualityFilters.push(buildMissingCoordinatesFilter());
        break;
      case 'HasCoordinates':
        builders.qualityFilters.push(buildHasCoordinatesFilter());
        break;
    }
  });

  const combinedFilters: Record<string, unknown>[] = [];
  if (builders.connectionFilters.length > 0) {
    combinedFilters.push({ $or: builders.connectionFilters });
  }
  if (builders.featureFilters.length > 0) {
    combinedFilters.push({ $or: builders.featureFilters });
  }
  if (builders.qualityFilters.length > 0) {
    combinedFilters.push({ $or: builders.qualityFilters });
  }

  return combinedFilters;
}

/**
 * Builds the MongoDB filter for locations missing coordinates.
 * A location HAS coordinates if ANY of googleMapsIframe, googleMapsLink,
 * or valid geoCoords is present. Missing = ALL are absent.
 */
function buildMissingCoordinatesFilter(): Record<string, unknown> {
  return {
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
              { 'geoCoords.longtitude': { $in: [0, '0', '0.0', ''] } },
              { 'geoCoords.longtitude': { $type: 'string' } },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Builds the MongoDB filter for locations that DO have coordinates.
 */
function buildHasCoordinatesFilter(): Record<string, unknown> {
  return {
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
  };
}

// ============================================================================
// 3. Fetch Aggregated Machine Stats
// ============================================================================

/**
 * Fetches machine statistics (total, with relay, online, activity) for
 * matching locations using a $lookup aggregation.
 *
 * @param {{ $and: Array<Record<string, unknown>> }} locationMatch - Location match filter
 * @param {boolean} showArchived - Include archived locations
 * @returns {Promise<LocationRecord[]>} Aggregated location documents with machineStats
 */
export async function fetchMachineStats(
  locationMatch: { $and: Array<Record<string, unknown>> },
  showArchived: boolean
): Promise<LocationRecord[]> {
  return GamingLocations.aggregate([
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
                  { $eq: [{ $toString: '$gamingLocation' }, { $toString: '$$id' }] },
                  { $eq: ['$gamingLocation', '$$id'] },
                ],
              },
              ...(showArchived
                ? { deletedAt: { $gte: DELETION_SOFT_CUTOFF } }
                : {
                    $or: [
                      { deletedAt: null },
                      { deletedAt: { $lt: DELETION_SOFT_CUTOFF } },
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
                      $or: [
                        {
                          $and: [
                            { $ifNull: ['$relayId', false] },
                            { $ne: [{ $trim: { input: { $toString: { $ifNull: ['$relayId', ''] } } } }, ''] },
                          ],
                        },
                        { $eq: ['$meta.dataSync.source', 'wow'] },
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
                      // WOW machines have no relay/activity but always count as online.
                      $or: [
                        {
                          $gte: [
                            { $convert: { input: '$lastActivity', to: 'date', onError: new Date(0) } },
                            new Date(Date.now() - 3 * 60 * 1000),
                          ],
                        },
                        { $eq: ['$meta.dataSync.source', 'wow'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              hasActivityCount: {
                $sum: { $cond: [{ $ifNull: ['$lastActivity', false] }, 1, 0] },
              },
              latestActivity: { $max: '$lastActivity' },
            },
          },
        ],
        as: 'machineStats',
      },
    },
  ]).exec();
}

// ============================================================================
// 4. Compute Financial Metrics
// ============================================================================

/**
 * Computes financial metrics (money in, money out, jackpot) for all
 * matching locations using gaming day ranges and batch meter aggregation.
 *
 * @param {LocationRecord[]} matchingLocations - Location documents from aggregation
 * @param {TimePeriod} timePeriod - Time range for metrics
 * @param {Date} [customStartDate] - Custom range start
 * @param {Date} [customEndDate] - Custom range end
 * @returns {Promise<{ metersByLocation: MetersByLocation; memberCountMap: Map<string, number>; licenceeIncludeJackpotMap: Map<string, boolean>; allLocationIds: string[]; globalEnd: Date }>}
 */
export async function computeFinancialMetrics(
  matchingLocations: LocationRecord[],
  timePeriod: TimePeriod,
  customStartDate?: Date,
  customEndDate?: Date
): Promise<{
  metersByLocation: MetersByLocation;
  memberCountMap: Map<string, number>;
  licenceeIncludeJackpotMap: Map<string, boolean>;
  allLocationIds: string[];
  globalEnd: Date;
}> {
  // Step 1: Calculate gaming day ranges for all locations
  const gamingDayRanges = new Map<string, { rangeStart: Date; rangeEnd: Date; gameDayOffset: number }>();
  matchingLocations.forEach(location => {
    const locationId = String(location._id);
    const gameDayOffset = (location.gameDayOffset as number) ?? 8;
    const gamingDayRange = getGamingDayRangeForPeriod(timePeriod, gameDayOffset, customStartDate, customEndDate);
    gamingDayRanges.set(locationId, { ...gamingDayRange, gameDayOffset });
  });

  // Step 2: Get global date range for initial meter query
  let globalStart = new Date();
  let globalEnd = new Date(0);
  gamingDayRanges.forEach(range => {
    if (range.rangeStart < globalStart) globalStart = range.rangeStart;
    if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
  });

  // Step 3: Get ALL location IDs
  const allLocationIds = matchingLocations.map(location => String(location._id));

  // Step 5: Get ALL meters grouped by location with hourly bucketing
  const metersByLocation: MetersByLocation = new Map();

  if (allLocationIds.length > 0) {
    const cursor = Meters.aggregate([
      {
        $match: {
          location: { $in: allLocationIds },
          readAt: { $gte: globalStart, $lte: globalEnd },
        },
      },
      {
        $group: {
          _id: {
            location: '$location',
            hour: { $dateTrunc: { date: '$readAt', unit: 'hour' } },
          },
          totalMoneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
          totalMoneyOut: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
          totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
        },
      },
    ]).cursor({ batchSize: 1000 });

    for await (const doc of cursor) {
      const locationId = String(doc._id.location);
      const bucketHour = new Date(doc._id.hour);
      const gamingDayRange = gamingDayRanges.get(locationId);
      if (!gamingDayRange) continue;

      const isWithinRange = bucketHour >= gamingDayRange.rangeStart && bucketHour <= gamingDayRange.rangeEnd;
      if (isWithinRange) {
        if (!metersByLocation.has(locationId)) {
          metersByLocation.set(locationId, { totalMoneyIn: 0, totalMoneyOut: 0, totalJackpot: 0 });
        }
        const currentMetrics = metersByLocation.get(locationId);
        if (!currentMetrics) continue;
        currentMetrics.totalMoneyIn += (doc.totalMoneyIn as number) || 0;
        currentMetrics.totalMoneyOut += (doc.totalMoneyOut as number) || 0;
        currentMetrics.totalJackpot += (doc.totalJackpot as number) || 0;
      }
    }
  }

  // Step 6: Fetch member counts per location
  const memberCountMap = await getMemberCountsPerLocation(allLocationIds);

  // Step 7: Fetch licencee settings (includeJackpot)
  const licenceeIds = Array.from(
    new Set(
      matchingLocations
        .map(location => {
          const rel = location.rel as { licencee?: string } | null;
          return rel?.licencee;
        })
        .filter(Boolean) as string[]
    )
  );
  const licencees = await Licencee.find({ _id: { $in: licenceeIds } }).lean<LicenceeDocument[]>();
  const licenceeIncludeJackpotMap = new Map(
    licencees.map(licencee => [String(licencee._id), !!licencee.includeJackpot])
  );

  return { metersByLocation, memberCountMap, licenceeIncludeJackpotMap, allLocationIds, globalEnd };
}

// ============================================================================
// 5. Build Location Results
// ============================================================================

/**
 * Builds a single AggregatedLocation result object from raw location data
 * and financial metrics.
 */
function buildLocationResult(params: {
  location: LocationRecord;
  locationId: string;
  metersByLocation: MetersByLocation;
  licenceeIncludeJackpotMap: Map<string, boolean>;
  syncAll: boolean;
  moneyInScale: number;
  moneyOutScale: number;
  memberCountMap: Map<string, number>;
}): LocationResult {
  const financialData = params.metersByLocation.get(params.locationId) || {
    totalMoneyIn: 0,
    totalMoneyOut: 0,
    totalJackpot: 0,
  };

  const membershipEnabled = Boolean(
    params.location.membershipEnabled || (params.location as { enableMembership?: boolean }).enableMembership
  );

  const locationRel = params.location.rel as { licencee?: string } | null;
  const licenceeId = locationRel?.licencee ? String(locationRel.licencee) : '';
  const includeJackpot = params.licenceeIncludeJackpotMap.get(licenceeId) || false;

  const rawMoneyIn = (financialData.totalMoneyIn || 0) * params.moneyInScale;
  const rawMoneyOut = (financialData.totalMoneyOut || 0) * params.moneyOutScale;
  const jackpot = (financialData.totalJackpot || 0) * params.moneyOutScale;

  const moneyOutValue = rawMoneyOut + (includeJackpot ? jackpot : 0);

  const machineStats = (params.location.machineStats as MachineStatsDoc[] | undefined)?.[0];
  const machineCount = machineStats?.totalMachines || 0;
  const withRelay = machineStats?.withRelayCount || 0;

  const useCached = params.syncAll && (
    params.location.fullSMIBs !== undefined || params.location.semiSMIBs !== undefined
  );
  const cachedFull = useCached
    ? Boolean(params.location.fullSMIBs)
    : machineCount > 0 && withRelay === machineCount;
  const cachedSemi = useCached
    ? Boolean(params.location.semiSMIBs)
    : machineCount > 0 && withRelay > 0 && withRelay < machineCount;
  const computedFull = cachedFull;
  const computedSemiVal = cachedSemi;
  const computedNone = !computedFull && !computedSemiVal;

  return {
    _id: params.locationId,
    location: params.locationId,
    locationName: params.location.name as string,
    name: params.location.name as string,
    address: params.location.address,
    country: params.location.country,
    rel: params.location.rel,
    profitShare: params.location.profitShare,
    geoCoords: params.location.geoCoords,
    totalMachines: machineCount,
    onlineMachines: params.location.aceEnabled
      ? machineCount
      : machineStats?.onlineMachines || 0,
    aceEnabled: Boolean(params.location.aceEnabled),
    moneyIn: rawMoneyIn,
    moneyOut: moneyOutValue,
    jackpot,
    includeJackpot,
    gross: rawMoneyIn - moneyOutValue,
    isLocalServer: Boolean(params.location.isLocalServer),
    hasSmib: computedFull || computedSemiVal,
    noSMIBLocation: computedNone,
    fullSMIBs: computedFull,
    semiSMIBs: computedSemiVal,
    membershipEnabled,
    memberCount: params.memberCountMap.get(params.locationId) || 0,
    isNeverOnline: machineCount > 0 && (machineStats?.hasActivityCount || 0) === 0,
    latestActivity: machineStats?.latestActivity
      ? new Date(machineStats.latestActivity).getTime()
      : 0,
    googleMapsLink: (params.location.googleMapsLink as string) || '',
    googleMapsIframe: (params.location.googleMapsIframe as string) || '',
  };
}

/**
 * Builds all location result objects from raw aggregation data and financial metrics.
 *
 * @param {Object} params - Build parameters
 * @returns {LocationResult[]} Array of hydrated location result objects
 */
export function buildLocationResults(params: {
  matchingLocations: LocationRecord[];
  metersByLocation: MetersByLocation;
  memberCountMap: Map<string, number>;
  licenceeIncludeJackpotMap: Map<string, boolean>;
  syncAll: boolean;
  moneyInScale: number;
  moneyOutScale: number;
}): LocationResult[] {
  return params.matchingLocations.map(location => {
    const locationId = String(location._id);
    return buildLocationResult({ ...params, location, locationId });
  });
}

// ============================================================================
// 6. Apply Online Status Filter & Sort
// ============================================================================

/**
 * Filters locations by online status and applies offline sorting if specified.
 *
 * @param {LocationResult[]} locations - Location result objects
 * @param {string} onlineStatus - Online status filter ('all', 'online', 'offline', 'neveronline', 'offlinelongest', 'offlineshortest')
 * @returns {LocationResult[]} Filtered and possibly sorted locations
 */
export function applyOnlineFilterAndSort(
  locations: LocationResult[],
  onlineStatus: string
): LocationResult[] {
  if (onlineStatus === 'all') return locations;

  // Filter by status
  const filtered = locations.filter(location => {
    const isOnline = location.onlineMachines > 0 || location.aceEnabled;

    if (onlineStatus === 'online') return isOnline;

    if (onlineStatus.startsWith('offline')) return !isOnline && location.totalMachines > 0;

    if (onlineStatus === 'neveronline') return location.isNeverOnline;

    return true;
  });

  // Sort by offline duration if specified
  if (onlineStatus === 'offlinelongest' || onlineStatus === 'offlineshortest') {
    return filtered.sort((a, b) => {
      const activityA = a.latestActivity || 0;
      const activityB = b.latestActivity || 0;
      return onlineStatus === 'offlinelongest'
        ? activityA - activityB
        : activityB - activityA;
    });
  }

  return filtered;
}

// ============================================================================
// 7. Apply Currency Conversion
// ============================================================================

/**
 * Converts location financial values from their native currency to the display currency.
 * Only applies for Admin/Developer roles when viewing "All Licencees" or cross-licencee.
 *
 * @param {LocationResult[]} locations - Location result objects with raw financial values
 * @param {CurrencyCode} displayCurrency - Target display currency code
 * @param {string} licencee - Licencee filter (empty = "All Licencees")
 * @returns {Promise<{ locations: LocationResult[]; isAdminOrDev: boolean }>}
 */
export async function applyCurrencyConversion(
  locations: LocationResult[],
  displayCurrency: CurrencyCode,
  licencee: string
): Promise<{ locations: LocationResult[]; isAdminOrDev: boolean }> {
  const { getUserFromServer } = await import('@/app/api/lib/helpers/users/users');
  const currentUser = await getUserFromServer();
  const currentUserRoles = (currentUser?.roles as string[]) || [];

  const isAdminOrDev =
    currentUserRoles.includes('admin') ||
    currentUserRoles.includes('developer') ||
    currentUserRoles.includes('owner');

  if (!isAdminOrDev || !shouldApplyCurrencyConversion(licencee)) {
    return { locations, isAdminOrDev };
  }

  // Fetch licencee data for currency mapping
  const licenceesData = await Licencee.find(
    {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lte: new Date('1971-01-01') } },
      ],
    },
    { _id: 1, name: 1 }
  ).lean<LicenceeDocument[]>();

  const licenceeIdToName = new Map<string, string>();
  licenceesData.forEach(licenceeDoc => {
    if (licenceeDoc._id && licenceeDoc.name) {
      licenceeIdToName.set(String(licenceeDoc._id), licenceeDoc.name);
    }
  });

  // Fetch country data for unassigned locations
  const countriesData = await Countries.find({}).lean<CountryDocument[]>();
  const countryIdToName = new Map<string, string>();
  countriesData.forEach(country => {
    if (country._id && country.name) {
      countryIdToName.set(String(country._id), country.name);
    }
  });

  // Convert each location
  const convertedLocations = locations.map(location => {
    const locationRel = location.rel as { licencee?: string } | null;
    const locationLicenceeId = locationRel?.licencee;

    if (!locationLicenceeId) {
      return convertUnassignedLocation(location, location.country as string | undefined, countryIdToName, displayCurrency);
    }

    return convertAssignedLocation(location, locationLicenceeId, licenceeIdToName, displayCurrency);
  });

  return { locations: convertedLocations, isAdminOrDev };
}

/**
 * Converts financial values for a location with no assigned licencee.
 * Uses the country to determine native currency.
 */
function convertUnassignedLocation(
  location: LocationResult,
  countryId: string | undefined,
  countryIdToName: Map<string, string>,
  displayCurrency: CurrencyCode
): LocationResult {
  const countryName = countryId ? countryIdToName.get(countryId) : undefined;
  const nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';

  const round = (value: number): number => Math.round(value * 100) / 100;

  if (nativeCurrency === displayCurrency) {
    return {
      ...location,
      moneyIn: round(location.moneyIn),
      moneyOut: round(location.moneyOut),
      gross: round(location.gross),
    };
  }

  const moneyInUSD = convertToUSD(location.moneyIn, nativeCurrency);
  const moneyOutUSD = convertToUSD(location.moneyOut, nativeCurrency);
  const grossUSD = convertToUSD(location.gross, nativeCurrency);

  return {
    ...location,
    moneyIn: round(convertFromUSD(moneyInUSD, displayCurrency)),
    moneyOut: round(convertFromUSD(moneyOutUSD, displayCurrency)),
    gross: round(convertFromUSD(grossUSD, displayCurrency)),
  };
}

/**
 * Converts financial values for a location with an assigned licencee.
 * Uses the licencee name to determine native currency.
 */
function convertAssignedLocation(
  location: LocationResult,
  licenceeId: string,
  licenceeIdToName: Map<string, string>,
  displayCurrency: CurrencyCode
): LocationResult {
  const licenceeName = licenceeIdToName.get(licenceeId) || 'Unknown';
  const round = (value: number): number => Math.round(value * 100) / 100;

  if (licenceeName === displayCurrency) {
    return {
      ...location,
      moneyIn: round(location.moneyIn),
      moneyOut: round(location.moneyOut),
      jackpot: round(location.jackpot),
      gross: round(location.gross),
    };
  }

  const moneyInUSD = convertToUSD(location.moneyIn, licenceeName);
  const moneyOutUSD = convertToUSD(location.moneyOut, licenceeName);
  const jackpotUSD = convertToUSD(location.jackpot, licenceeName);
  const grossUSD = convertToUSD(location.gross, licenceeName);

  return {
    ...location,
    moneyIn: round(convertFromUSD(moneyInUSD, displayCurrency)),
    moneyOut: round(convertFromUSD(moneyOutUSD, displayCurrency)),
    jackpot: round(convertFromUSD(jackpotUSD, displayCurrency)),
    gross: round(convertFromUSD(grossUSD, displayCurrency)),
  };
}

// ============================================================================
// 8. Format & Sort Final Response
// ============================================================================

/**
 * Formats location results into the final API response shape and applies
 * search relevance, connectivity, and gross-based sorting.
 *
 * @param {LocationResult[]} locations - Hydrated location results
 * @param {string} search - Original search query for relevance sorting
 * @returns {Array<Record<string, unknown>>} Formatted and sorted response array
 */
export function formatSearchResponse(
  locations: LocationResult[],
  search: string
): Array<Record<string, unknown>> {
  const response = locations.map(location => ({
    _id: location._id,
    location: location._id,
    locationName: location.name || 'Unknown Location',
    country: location.country,
    address: location.address,
    rel: location.rel,
    profitShare: location.profitShare,
    geoCoords: location.geoCoords,
    totalMachines: location.totalMachines,
    onlineMachines: location.onlineMachines,
    moneyIn: location.moneyIn,
    moneyOut: location.moneyOut,
    jackpot: location.jackpot,
    includeJackpot: location.includeJackpot,
    gross: location.gross,
    isLocalServer: location.isLocalServer,
    hasSmib: location.hasSmib,
    noSMIBLocation: location.noSMIBLocation,
    fullSMIBs: location.fullSMIBs,
    semiSMIBs: location.semiSMIBs,
    membershipEnabled: location.membershipEnabled,
    memberCount: location.memberCount,
    aceEnabled: location.aceEnabled,
    isNeverOnline: location.isNeverOnline,
    latestActivity: location.latestActivity,
    googleMapsLink: location.googleMapsLink,
    googleMapsIframe: location.googleMapsIframe,
  }));

  return applySearchSorting(response, search);
}

/**
 * Applies multi-level sorting: search prefix relevance → online status → gross descending → alphabetical.
 */
function applySearchSorting(
  response: Array<Record<string, unknown>>,
  search: string
): Array<Record<string, unknown>> {
  return response.sort((a, b) => {
    // Search relevance (prefix match ranks highest)
    if (search) {
      const searchLower = search.toLowerCase();
      const aName = (a.locationName as string).toLowerCase();
      const bName = (b.locationName as string).toLowerCase();
      const aStarts = aName.startsWith(searchLower);
      const bStarts = bName.startsWith(searchLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    }

    // Connectivity (online first)
    const aOnline = (a.onlineMachines as number) > 0 || (a.aceEnabled as boolean);
    const bOnline = (b.onlineMachines as number) > 0 || (b.aceEnabled as boolean);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    // Gross descending
    const bGross = (b.gross as number) || 0;
    const aGross = (a.gross as number) || 0;
    if (bGross !== aGross) return bGross - aGross;

    // Alphabetical fallback
    return (a.locationName as string).localeCompare(b.locationName as string);
  });
}

// ============================================================================
// 9. Safe Number Helpers
// ============================================================================

/**
 * Safely extracts a string value from an unknown source with a fallback.
 */
export function safeString(value: unknown, fallback: string = ''): string {
  return value != null ? String(value) : fallback;
}

/**
 * Safely extracts a number value from an unknown source with a fallback.
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value != null) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
