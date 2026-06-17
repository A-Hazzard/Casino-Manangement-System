/**
 * Locations Report Operations
 *
 * Business logic for the locations report API route (GET /api/reports/locations).
 * Provides helper functions for parameter parsing, SMIB auto-tagging,
 * meter aggregation, location result building, and filtering/sorting.
 *
 * @module app/api/lib/helpers/reports/locationReportOperations
 */

import { Licencee } from '@/app/api/lib/models/licencee';
import { Meters } from '@/app/api/lib/models/meters';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import {
  fetchLocationsWithMachinesForSmib,
  syncAllLocationSmibStatuses,
} from '@/app/api/lib/helpers/smibClassification';
import type { GamingMachine, LicenceeDocument } from '@shared/types';
import type { LocationDocument } from '@/lib/types/common';
import type { CurrencyCode } from '@/shared/types/currency';
import type { AggregatedLocation } from '@/shared/types/entities';
import type { TimePeriod } from '@/shared/types/common';
import type { CollectionReportDocument } from '@/shared/types';
import { NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export type ReportLocationsParams = {
  timePeriod: TimePeriod;
  licencee: string | undefined;
  currencyParam: CurrencyCode | null;
  displayCurrency: CurrencyCode;
  searchTerm: string;
  machineTypeFilter: string | null;
  onlineStatus: string;
  specificLocations: string[];
  showAllLocations: boolean;
  showArchived: boolean;
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  syncAll: boolean;
  customStartDate: Date | undefined;
  customEndDate: Date | undefined;
};

type MetersBucket = {
  _id: { location: string; machine: string; hour: Date };
  totalDrop: number;
  totalCancelledCredits: number;
  totalJackpot: number;
};

type MetricsMap = Map<
  string,
  { totalDrop: number; totalCancelledCredits: number; totalJackpot: number }
>;

// ============================================================================
// STEP 1: Parse and validate request parameters
// ============================================================================

/**
 * Parses and validates all query parameters from the locations report request.
 */
export function parseReportLocationsParams(
  searchParams: URLSearchParams
): ReportLocationsParams {
  const timePeriod =
    (searchParams.get('timePeriod') as TimePeriod) || '7d';
  const licencee = searchParams.get('licencee') || undefined;
  const currencyParam = searchParams.get('currency') as CurrencyCode | null;
  const displayCurrency: CurrencyCode = currencyParam || 'USD';
  const searchTerm = searchParams.get('search')?.trim() || '';
  const machineTypeFilter = searchParams.get('machineTypeFilter');
  const onlineStatus =
    searchParams.get('onlineStatus')?.toLowerCase() || 'all';
  const specificLocations =
    searchParams.get('locations')?.split(',').filter(Boolean) || [];
  const showAllLocations = searchParams.get('showAllLocations') === 'true';
  const showArchived = searchParams.get('archived') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = showAllLocations
    ? 10000
    : Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const skip = showAllLocations ? 0 : (page - 1) * limit;
  const sortBy = searchParams.get('sortBy') || 'gross';
  const sortOrder =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const syncAll = searchParams.get('syncAll') === 'true';

  let customStartDate: Date | undefined;
  let customEndDate: Date | undefined;
  if (timePeriod === 'Custom') {
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start && end) {
      customStartDate = start.includes('T')
        ? new Date(start)
        : new Date(start + 'T00:00:00.000Z');
      customEndDate = end.includes('T')
        ? new Date(end)
        : new Date(end + 'T00:00:00.000Z');
    }
  }

  return {
    timePeriod,
    licencee,
    currencyParam,
    displayCurrency,
    searchTerm,
    machineTypeFilter,
    onlineStatus,
    specificLocations,
    showAllLocations,
    showArchived,
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    syncAll,
    customStartDate,
    customEndDate,
  };
}

// ============================================================================
// STEP 2: Resolve licencee and display currency
// ============================================================================

/**
 * Resolves the effective licencee (auto-select if user has only one) and
 * derives the display currency from the licencee when no currency param is given.
 */
export async function resolveLicenceeAndDisplayCurrency(
  licencee: string | undefined,
  currencyParam: CurrencyCode | null,
  userAccessibleLicencees: string[] | 'all'
): Promise<{ resolvedLicencee: string | undefined; displayCurrency: CurrencyCode }> {
  let resolvedLicencee =
    licencee && licencee !== 'all' ? licencee : undefined;
  if (
    !resolvedLicencee &&
    userAccessibleLicencees !== 'all' &&
    userAccessibleLicencees.length === 1
  ) {
    resolvedLicencee = userAccessibleLicencees[0];
  }

  let displayCurrency: CurrencyCode = currencyParam || 'USD';
  if (!currencyParam && resolvedLicencee) {
    const licenceeDoc = await Licencee.findOne(
      { _id: resolvedLicencee },
      { name: 1 }
    ).lean<LicenceeDocument>();
    if (licenceeDoc && !Array.isArray(licenceeDoc) && licenceeDoc.name) {
      const { getLicenceeCurrency } = await import('@/lib/helpers/rates');
      displayCurrency = getLicenceeCurrency(licenceeDoc.name);
    }
  }

  return { resolvedLicencee, displayCurrency };
}

// ============================================================================
// STEP 3: Build location match stage
// ============================================================================

/**
 * Builds the MongoDB $match filter for the GamingLocations query.
 * Combines soft-delete filter, licencee filter, location permissions,
 * search, and machine type filters.
 */
export function buildLocationMatchStage(params: {
  showArchived: boolean;
  allowedLocationIds: string[] | 'all';
  specificLocations: string[];
  licencee: string | undefined;
  searchTerm: string;
  machineTypeFilter: string | null;
  isAdminOrDev: boolean;
}): Record<string, unknown> {
  const { showArchived, allowedLocationIds, specificLocations, licencee, searchTerm, machineTypeFilter, isAdminOrDev } = params;

  const locationMatchStage: Record<string, unknown> = showArchived
    ? { deletedAt: { $gte: new Date('2025-01-01') } }
    : {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      };

  if (allowedLocationIds !== 'all') {
    let intersection = allowedLocationIds;
    if (specificLocations.length > 0) {
      intersection = allowedLocationIds.filter(id =>
        specificLocations.includes(String(id))
      );
    }
    locationMatchStage._id = { $in: intersection };
  } else if (specificLocations.length > 0) {
    locationMatchStage._id = { $in: specificLocations };
  }

  if (licencee && licencee !== 'all') {
    const andArray = ensureAndArray(locationMatchStage);
    andArray.push({
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
    const andArray = ensureAndArray(locationMatchStage);
    andArray.push(searchFilter);
  }

  if (!isAdminOrDev) {
    const testFilter = { name: { $not: /^test/i } };
    const andArray = ensureAndArray(locationMatchStage);
    andArray.push(testFilter);
  }

  if (machineTypeFilter) {
    const filterConditions = buildMachineTypeFilterConditions(machineTypeFilter);
    const andArray = ensureAndArray(locationMatchStage);
    filterConditions.forEach(condition => andArray.push(condition));
  }

  return locationMatchStage;
}

/**
 * Ensures the $and array exists on the match stage and returns it.
 */
function ensureAndArray(
  stage: Record<string, unknown>
): Array<Record<string, unknown>> {
  if (!stage.$and || !Array.isArray(stage.$and)) {
    stage.$and = [];
  }
  return stage.$and as Array<Record<string, unknown>>;
}

/**
 * Parses a comma-separated machine type filter string into MongoDB $and conditions.
 * Groups by category (connection, feature, quality) with OR within each category.
 */
function buildMachineTypeFilterConditions(
  machineTypeFilter: string
): Array<Record<string, unknown>> {
  const filters = machineTypeFilter
    .split(',')
    .filter(type => type.trim() !== '');

  const connectionFilters: Record<string, unknown>[] = [];
  const featureFilters: Record<string, unknown>[] = [];
  const qualityFilters: Record<string, unknown>[] = [];

  filters.forEach(filter => {
    const filterItem = filter.trim();
    switch (filterItem) {
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
      case 'MembershipOnly':
        featureFilters.push({
          $or: [{ membershipEnabled: true }, { enableMembership: true }],
        });
        break;
      case 'MissingCoordinates':
        qualityFilters.push(buildMissingCoordinatesFilter());
        break;
      case 'HasCoordinates':
        qualityFilters.push(buildHasCoordinatesFilter());
        break;
    }
  });

  const combinedFilters: Record<string, unknown>[] = [];
  if (connectionFilters.length > 0)
    combinedFilters.push({ $or: connectionFilters });
  if (featureFilters.length > 0)
    combinedFilters.push({ $or: featureFilters });
  if (qualityFilters.length > 0)
    combinedFilters.push({ $or: qualityFilters });

  return combinedFilters;
}

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
// STEP 5: SMIB auto-classification
// ============================================================================

/**
 * Classifies each location's SMIB status (fullSMIBs, semiSMIBs, noSMIBLocation)
 * based on relayId presence on machines. Uses cached DB values unless syncAll=true.
 * Mutates the `locations` array in-place with the computed SMIB flags.
 */
export async function applySmibClassification(
  locations: LocationDocument[],
  syncAll: boolean,
  allLocationIds: string[],
  locationToMachines: Map<string, GamingMachine[]>
): Promise<void> {
  if (syncAll && allLocationIds.length > 0) {
    console.log(
      `[SMIB Auto-tag] syncAll=true - running full classification for ${allLocationIds.length} locations`
    );
    const locationsWithMachines =
      await fetchLocationsWithMachinesForSmib(allLocationIds);
    for (const item of locationsWithMachines) {
      const machines = item.machines ?? [];
      const withRelay = machines.filter(
        m => m.relayId && String(m.relayId).trim()
      ).length;
      const computedFull =
        machines.length > 0 && withRelay === machines.length;
      const computedSemi =
        machines.length > 0 &&
        withRelay > 0 &&
        withRelay < machines.length;
      const computedNone = !computedFull && !computedSemi;
      item.location.fullSMIBs = computedFull;
      item.location.semiSMIBs = computedSemi;
      item.location.noSMIBLocation = computedNone;
    }
    await syncAllLocationSmibStatuses(locationsWithMachines);
    for (const loc of locations) {
      const matching = locationsWithMachines.find(
        l => String(l.location._id) === String(loc._id)
      );
      if (matching) {
        loc.fullSMIBs = matching.location.fullSMIBs;
        loc.semiSMIBs = matching.location.semiSMIBs;
        loc.noSMIBLocation = matching.location.noSMIBLocation;
      }
    }
  } else {
    for (const location of locations) {
      const machines = locationToMachines.get(String(location._id)) ?? [];
      const withRelay = machines.filter(
        m => m.relayId && String(m.relayId).trim()
      ).length;
      const computedFull =
        machines.length > 0 && withRelay === machines.length;
      const computedSemi =
        machines.length > 0 &&
        withRelay > 0 &&
        withRelay < machines.length;
      const computedNone = !computedFull && !computedSemi;
      location.fullSMIBs = computedFull;
      location.semiSMIBs = computedSemi;
      location.noSMIBLocation = computedNone;
    }
  }
}

// ============================================================================
// STEP 4: Compute location metrics from Meters
// ============================================================================

/**
 * Aggregates meter readings (drop, cancelled credits, jackpot) for each location
 * using a cursor-based aggregation filtered by gaming day ranges per location.
 */
export async function computeLocationMetrics(
  allLocationIds: string[],
  allMachineIds: string[],
  globalStart: Date,
  globalEnd: Date
): Promise<MetricsMap> {
  const metricsMap: MetricsMap = new Map();

  if (allLocationIds.length === 0 || allMachineIds.length === 0) {
    return metricsMap;
  }

  const metersCursor = Meters.aggregate<MetersBucket>([
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
    if (!metricsMap.has(locId)) {
      metricsMap.set(locId, {
        totalDrop: 0,
        totalCancelledCredits: 0,
        totalJackpot: 0,
      });
    }
    const current = metricsMap.get(locId)!;
    current.totalDrop += doc.totalDrop || 0;
    current.totalCancelledCredits += doc.totalCancelledCredits || 0;
    current.totalJackpot += doc.totalJackpot || 0;
  }

  return metricsMap;
}

// ============================================================================
// STEP 4: Fetch licencee include-jackpot settings
// ============================================================================

/**
 * Fetches the includeJackpot setting for all licencees referenced by the locations.
 */
export async function getLicenceeJackpotSettings(
  locations: LocationDocument[]
): Promise<Map<string, boolean>> {
  const licenceeIds = Array.from(
    new Set(
      locations
        .map(loc => {
          const licenceeRef = loc.rel?.licencee;
          return Array.isArray(licenceeRef)
            ? licenceeRef[0] ? String(licenceeRef[0]) : ''
            : licenceeRef ? String(licenceeRef) : '';
        })
        .filter(Boolean)
    )
  );

  if (licenceeIds.length === 0) return new Map();

  const licencees = await Licencee.find({
    _id: { $in: licenceeIds },
  }).lean<LicenceeDocument[]>();

  return new Map(
    licencees.map(l => [String(l._id), !!l.includeJackpot])
  );
}

// ============================================================================
// STEP 4/5: Build aggregated location results
// ============================================================================

/**
 * Builds the final AggregatedLocation[] array from raw location documents,
 * machine data, computed metrics, member counts, and reviewer scale factors.
 */
export function buildLocationResults(
  locations: LocationDocument[],
  locationToMachines: Map<string, GamingMachine[]>,
  metricsMap: MetricsMap,
  memberCountMap: Map<string, number>,
  licenceeIncludeJackpotMap: Map<string, boolean>,
  moneyInScale: number,
  moneyOutScale: number
): AggregatedLocation[] {
  const onlineThreshold = Date.now() - 3 * 60 * 1000;

  return locations.map(loc => {
    const locId = String(loc._id);
    const machines = locationToMachines.get(locId) || [];
    const metrics = metricsMap.get(locId) || {
      totalDrop: 0,
      totalCancelledCredits: 0,
      totalJackpot: 0,
    };

    const scaledDrop = (metrics.totalDrop || 0) * moneyInScale;
    const scaledCancelled =
      (metrics.totalCancelledCredits || 0) * moneyOutScale;
    const scaledJackpot = (metrics.totalJackpot || 0) * moneyOutScale;

    const licenceeRef = loc.rel?.licencee;
    const licenceeId = Array.isArray(licenceeRef)
      ? licenceeRef[0] ? String(licenceeRef[0]) : ''
      : licenceeRef ? String(licenceeRef) : '';
    const includeJackpot = licenceeId
      ? licenceeIncludeJackpotMap.get(licenceeId) || false
      : false;

    const eligibleMachines = machines.filter(
      m => m.relayId && String(m.relayId).trim().length > 0
    );
    const onlineMachines = loc.aceEnabled
      ? eligibleMachines.length
      : eligibleMachines.filter(m => {
          if (!m.lastActivity) return false;
          try {
            const activityDate =
              m.lastActivity instanceof Date
                ? m.lastActivity
                : new Date(String(m.lastActivity).replace(' ', 'T'));
            return activityDate.getTime() >= onlineThreshold;
          } catch {
            return false;
          }
        }).length;

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
          (scaledDrop -
            (scaledCancelled + (includeJackpot ? scaledJackpot : 0))) *
            100
        ) / 100,
      jackpot: Math.round(scaledJackpot * 100) / 100,
      totalMachines: machines.length,
      onlineMachines,
      sasMachines: machines.filter(m => m.isSasMachine).length,
      nonSasMachines: machines.filter(m => !m.isSasMachine).length,
      hasSasMachines: machines.some(m => m.isSasMachine),
      hasNonSasMachines: machines.some(m => !m.isSasMachine),
      noSMIBLocation: Boolean(loc.noSMIBLocation),
      fullSMIBs: Boolean(loc.fullSMIBs),
      semiSMIBs: Boolean(loc.semiSMIBs),
      hasSmib: Boolean(loc.fullSMIBs) || Boolean(loc.semiSMIBs),
      rel: loc.rel,
      isLocalServer: Boolean(loc.isLocalServer),
      country: loc.country,
      geoCoords: loc.geoCoords,
      deletedAt: loc.deletedAt,
      membershipEnabled: !!(
        loc.membershipEnabled || loc.enableMembership
      ),
      memberCount: memberCountMap.get(locId) || 0,
      googleMapsLink: loc.googleMapsLink || '',
      googleMapsIframe: loc.googleMapsIframe || '',
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
}

// ============================================================================
// STEP 5.5: Non-SMIB offline collection override
// ============================================================================

/**
 * Marks non-SMIB locations as offline (onlineMachines = 0) if no collection
 * report has been filed in the past 3 months.
 * Mutates the `locationResults` array in-place.
 */
export async function applyNonSmibOfflineOverride(
  locationResults: AggregatedLocation[]
): Promise<void> {
  const nonSmibLocations = locationResults.filter(
    loc => loc.sasMachines === 0 || loc.noSMIBLocation
  );

  if (nonSmibLocations.length === 0) return;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const nonSmibLocationIds = nonSmibLocations.map(loc => loc._id ?? loc.location);
  const recentCollectionReports = await CollectionReport.find({
    location: { $in: nonSmibLocationIds },
    timestamp: { $gte: threeMonthsAgo },
  })
    .select('location timestamp')
    .lean<CollectionReportDocument[]>();

  const locationsWithRecentReports = new Set<string>();
  recentCollectionReports.forEach(report => {
    if (report.location) {
      locationsWithRecentReports.add(String(report.location));
    }
  });

  locationResults.forEach(loc => {
    if (
      (loc.sasMachines === 0 || loc.noSMIBLocation) &&
      !locationsWithRecentReports.has(loc._id || '')
    ) {
      loc.onlineMachines = 0;
    }
  });
}

// ============================================================================
// STEP 6: Filter and sort results
// ============================================================================

/**
 * Filters location results by online status, then sorts by the given field.
 * Returns the filtered AND sorted array (mutated in-place).
 */
export function filterAndSortLocations(
  locationResults: AggregatedLocation[],
  onlineStatus: string,
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): AggregatedLocation[] {
  let filtered = locationResults;

  if (onlineStatus !== 'all') {
    filtered = locationResults.filter(loc => {
      const isOnline = loc.onlineMachines > 0;
      if (onlineStatus === 'online') return isOnline;
      if (onlineStatus.startsWith('offline'))
        return !isOnline && loc.totalMachines > 0;
      return true;
    });
  }

  filtered.sort((a, b) => {
    if (sortBy === 'default') {
      const aOnline = a.onlineMachines > 0 || a.aceEnabled;
      const bOnline = b.onlineMachines > 0 || b.aceEnabled;
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      const bGross = b.gross || 0;
      const aGross = a.gross || 0;
      return bGross - aGross;
    }

    const valA = (a as Record<string, unknown>)[sortBy] as number ?? 0;
    const valB = (b as Record<string, unknown>)[sortBy] as number ?? 0;
    return sortOrder === 'asc'
      ? valA < valB
        ? -1
        : 1
      : valA > valB
        ? -1
        : 1;
  });

  return filtered;
}

// ============================================================================
// Utility: empty response
// ============================================================================

/**
 * Returns an empty paginated response for when the user has no location access.
 */
export function createEmptyResponse(
  page: number,
  limit: number,
  currency: string
): NextResponse {
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
