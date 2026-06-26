/**
 * Cabinet Aggregation Helpers
 *
 * Extracted business logic for the cabinets aggregation route.
 * Handles machine query building, response formatting, offline status,
 * currency conversion, reviewer scaling, and sorting.
 *
 * @module app/api/lib/helpers/cabinetAggregation
 */

import type { LocationDocument } from '@/lib/types/common';
import type {
  GamingMachine,
} from '@shared/types';
import type { CurrencyCode } from '@/shared/types/currency';
import { isWowMachine } from '@/shared/utils/wowMachine';
import { formatDistanceToNow } from 'date-fns';
import type { PipelineStage } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export type CabinetAggregationParams = {
  locationIdArray: string[];
  selectedGameTypes: string[];
  searchTerm: string;
  licencee: string | null;
  timePeriod: string;
  displayCurrency: CurrencyCode;
  onlineStatus: string;
  smibStatus: string;
  membership: string;
  page: number;
  limit: number | undefined;
  startDateParam: string | null;
  endDateParam: string | null;
  debug: boolean;
};

export type MachineMetrics = {
  moneyIn: number;
  moneyOut: number;
  jackpot: number;
  coinIn: number;
  coinOut: number;
  gamesPlayed: number;
  gamesWon: number;
  handPaidCancelledCredits: number;
  meterCount: number;
};

export type CabinetMachineResponse = {
  _id: string;
  locationId: string;
  locationName: string;
  assetNumber: string;
  serialNumber: string;
  custom: Record<string, unknown>;
  game: string;
  installedGame: string;
  denomination: string;
  manufacturer: string;
  model: string;
  status: string;
  isSasMachine: boolean;
  aceEnabled: boolean;
  relayId: string;
  smibBoard: string;
  smbId: string;
  cabinetType: string;
  assetStatus: string;
  accountingDenomination: string;
  collectorDenomination: number;
  collectionMultiplier: string;
  isCronosMachine: boolean;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
  deletedAt: Date | undefined;
  lastOnline: Date | null;
  lastActivity: Date | null;
  online: boolean;
  moneyIn: number;
  moneyOut: number;
  cancelledCredits: number;
  gross: number;
  netGross: number;
  jackpot: number;
  coinIn: number;
  coinOut: number;
  gamesPlayed: number;
  gamesWon: number;
  includeJackpot: boolean;
  handPaidCancelledCredits: number;
  meterCount: number;
  rel: LocationDocument['rel'];
  country: string | undefined;
  timePeriod?: string;
  offlineTimeLabel?: string;
  actualOfflineTime?: string;
  meta?: { dataSync?: { source?: string; wowbettingshopid?: string } };
};

type LocationWithRange = {
  _id: string;
  gameDayOffset: number;
  includeJackpot: boolean;
};

// ============================================================================
// Query Parameter Parsing
// ============================================================================

/**
 * Parses and normalizes all query parameters for the cabinet aggregation endpoint.
 *
 * @param {URLSearchParams} searchParams - The URL search parameters
 * @returns {CabinetAggregationParams} Parsed parameters
 */
export function parseCabinetAggregationParams(
  searchParams: URLSearchParams
): CabinetAggregationParams {
  const locationIdsParam =
    searchParams.get('locationId') || searchParams.get('locationIds');
  const locationIdArray = locationIdsParam
    ? locationIdsParam
        .split(',')
        .filter(id => id && id !== 'all' && id !== 'null')
    : [];

  const gameTypesParam =
    searchParams.get('gameType') || searchParams.get('gameTypes');
  const selectedGameTypes = gameTypesParam
    ? gameTypesParam
        .split(',')
        .filter(type => type && type !== 'all' && type !== 'null')
    : [];

  const searchTerm = searchParams.get('search')?.trim() || '';
  const licencee = searchParams.get('licencee');
  const timePeriod = searchParams.get('timePeriod') || '';
  const displayCurrency =
    (searchParams.get('currency') as CurrencyCode) || 'USD';
  const rawOnlineStatus = searchParams.get('onlineStatus') || 'all';
  const onlineStatus = rawOnlineStatus.toLowerCase();
  const rawSmibStatus = searchParams.get('smibStatus') || 'all';
  const smibStatus = rawSmibStatus.toLowerCase();
  const membership = searchParams.get('membership')?.toLowerCase() || 'all';

  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  const limit = limitParam
    ? Math.max(1, parseInt(limitParam, 10))
    : undefined;

  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const debug = searchParams.get('debug') === 'true';

  return {
    locationIdArray,
    selectedGameTypes,
    searchTerm,
    licencee,
    timePeriod,
    displayCurrency,
    onlineStatus,
    smibStatus,
    membership,
    page,
    limit,
    startDateParam,
    endDateParam,
    debug,
  };
}

// ============================================================================
// Machine Match Query Builder
// ============================================================================

/**
 * Builds the MongoDB match query for filtering machines.
 * Eliminates duplication between the 7d/30d and batch processing branches.
 *
 * @param {string[]} locationIds - Location IDs to filter by
 * @param {Record<string, unknown>} deletedFilter - Soft-delete filter
 * @param {CabinetAggregationParams} params - Parsed query parameters
 * @param {LocationDocument[]} locations - Fetched locations for aceEnabled check
 * @returns {Record<string, unknown>} The MongoDB match query
 */
export function buildMachineMatchQuery(
  locationIds: string[],
  deletedFilter: Record<string, unknown>,
  params: Pick<CabinetAggregationParams, 'searchTerm' | 'selectedGameTypes' | 'onlineStatus' | 'smibStatus'>,
  locations: LocationDocument[]
): Record<string, unknown> {
  const machineMatchQuery: Record<string, unknown> = {
    gamingLocation: { $in: locationIds },
    $and: [deletedFilter] as Array<Record<string, unknown>>,
  };

  const andArray = machineMatchQuery.$and as Array<Record<string, unknown>>;

  if (params.searchTerm) {
    const searchRegex = { $regex: params.searchTerm, $options: 'i' };
    andArray.push({
      $or: [
        { serialNumber: searchRegex },
        { 'custom.name': searchRegex },
        { 'Custom.name': searchRegex },
        { relayId: searchRegex },
        { smibBoard: searchRegex },
        { _id: searchRegex },
      ],
    });
  }

  if (params.selectedGameTypes.length > 0) {
    andArray.push({
      $or: [
        { game: { $in: params.selectedGameTypes } },
        {
          $and: [
            { $or: [{ game: null }, { game: '' }] },
            { gameType: { $in: params.selectedGameTypes } },
          ],
        },
      ],
    });
  }

  if (params.onlineStatus !== 'all') {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const aceEnabledLocIds = locations
      .filter(loc => loc.aceEnabled === true)
      .map(loc => String(loc._id));

    if (params.onlineStatus === 'online') {
      andArray.push({
        $or: [
          { relayId: { $exists: true, $nin: [null, ''] } },
          { 'meta.dataSync.source': 'wow' },
        ],
      });
      const onlineConds: Array<Record<string, unknown>> = [
        { lastActivity: { $gte: threeMinutesAgo } },
        { 'meta.dataSync.source': 'wow' },
      ];
      if (aceEnabledLocIds.length > 0) {
        onlineConds.push({ gamingLocation: { $in: aceEnabledLocIds } });
      }
      andArray.push({ $or: onlineConds });
    } else if (params.onlineStatus === 'offline') {
      andArray.push({ 'meta.dataSync.source': { $ne: 'wow' } });
      andArray.push({ relayId: { $exists: true, $nin: [null, ''] } });
      andArray.push({
        $or: [
          { lastActivity: { $lt: threeMinutesAgo } },
          { lastActivity: { $exists: false } },
          { lastActivity: null },
        ],
      });
      if (aceEnabledLocIds.length > 0) {
        andArray.push({ gamingLocation: { $nin: aceEnabledLocIds } });
      }
    } else if (params.onlineStatus === 'never-online') {
      andArray.push({ 'meta.dataSync.source': { $ne: 'wow' } });
      andArray.push({ relayId: { $exists: true, $nin: [null, ''] } });
      andArray.push({
        $or: [
          { lastActivity: { $exists: false } },
          { lastActivity: null },
        ],
      });
      if (aceEnabledLocIds.length > 0) {
        andArray.push({ gamingLocation: { $nin: aceEnabledLocIds } });
      }
    }
  }

  if (params.smibStatus !== 'all') {
    if (params.smibStatus === 'smib') {
      andArray.push({
        $or: [
          { relayId: { $ne: '', $exists: true, $not: /^\s*$/ } },
          { smibBoard: { $ne: '', $exists: true, $not: /^\s*$/ } },
          { 'meta.dataSync.source': 'wow' },
        ],
      });
    } else if (params.smibStatus === 'no-smib') {
      andArray.push({
        $and: [
          { 'meta.dataSync.source': { $ne: 'wow' } },
          {
            $or: [
              { relayId: '' },
              { relayId: null },
              { relayId: { $exists: false } },
              { relayId: /^\s*$/ },
            ],
          },
          {
            $or: [
              { smibBoard: '' },
              { smibBoard: null },
              { smibBoard: { $exists: false } },
              { smibBoard: /^\s*$/ },
            ],
          },
        ],
      });
    }
  }

  return machineMatchQuery;
}

// ============================================================================
// Machine Response Builder
// ============================================================================

/**
 * Builds a standardized machine response object from a GamingMachine,
 * its metrics, and location data. Eliminates duplication between branches.
 *
 * @param {GamingMachine} machine - The machine document
 * @param {MachineMetrics} metrics - Aggregated meter metrics
 * @param {LocationDocument} location - The machine's gaming location
 * @param {Map<string, boolean>} licenceeIncludeJackpotMap - Licencee jackpot settings
 * @param {string} timePeriod - Current time period for context
 * @returns {CabinetMachineResponse} Formatted machine response
 */
export function buildMachineResponse(
  machine: GamingMachine,
  metrics: MachineMetrics,
  location: LocationDocument,
  licenceeIncludeJackpotMap: Map<string, boolean>,
  timePeriod: string
): CabinetMachineResponse {
  const machineId = String(machine._id);
  const locationId = String(location._id);

  const licenceeId = Array.isArray(location.rel?.licencee)
    ? location.rel.licencee[0]
    : location.rel?.licencee;
  const includeJackpot = licenceeId
    ? licenceeIncludeJackpotMap.get(String(licenceeId)) || false
    : false;

  const moneyIn = metrics.moneyIn || 0;
  const rawMoneyOut = metrics.moneyOut || 0;
  const jackpot = metrics.jackpot || 0;
  const moneyOut = rawMoneyOut + (includeJackpot ? jackpot : 0);
  const gross = moneyIn - moneyOut;
  const netGross = moneyIn - rawMoneyOut - jackpot;

  const serialNumber = String(machine.serialNumber || '').trim();
  const customName = String(
    (machine.custom as Record<string, unknown>)?.name ||
      (machine as Record<string, unknown>).Custom ||
      ''
  ).trim();
  const finalSerialNumber = serialNumber || customName || '';

  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  const hasRelayId = !!(
    machine.relayId && String(machine.relayId).trim().length > 0
  );
  // WOW machines have no SMIB/relay but are always treated as online.
  const isWow = isWowMachine(machine);
  const isOnline =
    isWow ||
    (hasRelayId &&
      (location.aceEnabled === true ||
        (machine.lastActivity
          ? new Date(machine.lastActivity as Date) > threeMinutesAgo
          : false)));

  return {
    _id: machineId,
    locationId,
    locationName: (location.name as string) || '(No Location)',
    assetNumber: finalSerialNumber,
    serialNumber: finalSerialNumber,
    custom: (machine.custom || {}) as Record<string, unknown>,
    game: String(machine.game || machine.gameType || ''),
    installedGame: String(machine.game || machine.gameType || ''),
    denomination: String(machine.denomination || ''),
    manufacturer: String(machine.manufacturer || ''),
    model: String(machine.model || ''),
    status: machine.assetStatus || machine.machineStatus || 'unknown',
    isSasMachine: machine.isSasMachine || false,
    aceEnabled: location.aceEnabled === true,
    relayId: machine.relayId || '',
    smibBoard: machine.smibBoard || '',
    smbId: machine.relayId || machine.smibBoard || '',
    cabinetType: machine.cabinetType || '',
    assetStatus: machine.assetStatus || machine.machineStatus || '',
    accountingDenomination: String(
      machine.gameConfig?.accountingDenomination || '1'
    ),
    collectorDenomination: machine.collectorDenomination || 1,
    collectionMultiplier: String(machine.collectorDenomination || 1),
    isCronosMachine: false,
    createdAt: machine.createdAt as Date | undefined,
    updatedAt: machine.updatedAt as Date | undefined,
    deletedAt: machine.deletedAt as Date | undefined,
    lastOnline: (machine.lastActivity as Date | undefined) || null,
    lastActivity: (machine.lastActivity as Date | undefined) || null,
    online: isOnline,
    moneyIn,
    moneyOut,
    cancelledCredits: rawMoneyOut,
    gross,
    netGross,
    jackpot,
    coinIn: metrics.coinIn || 0,
    coinOut: metrics.coinOut || 0,
    gamesPlayed: metrics.gamesPlayed || 0,
    gamesWon: metrics.gamesWon || 0,
    includeJackpot,
    handPaidCancelledCredits: metrics.handPaidCancelledCredits || 0,
    meterCount: metrics.meterCount || 0,
    rel: location.rel,
    country: location.country,
    timePeriod,
    meta: machine.meta,
  };
}

// ============================================================================
// Meters Aggregation Pipeline Builder
// ============================================================================

/**
 * Builds the Meters aggregation pipeline for per-location metrics.
 *
 * @param {string[]} machineIds - Machine IDs to aggregate
 * @param {{ rangeStart: Date; rangeEnd: Date }} gameDayRange - Gaming day range
 * @returns {PipelineStage[]} The aggregation pipeline
 */
export function buildPerLocationMetersPipeline(
  machineIds: string[],
  gameDayRange: { rangeStart: Date; rangeEnd: Date }
): PipelineStage[] {
  return [
    {
      $match: {
        machine: { $in: machineIds },
        readAt: {
          $gte: gameDayRange.rangeStart,
          $lte: gameDayRange.rangeEnd,
        },
      },
    },
    {
      $project: {
        machine: 1,
        drop: '$movement.drop',
        totalCancelledCredits: '$movement.totalCancelledCredits',
        jackpot: '$movement.jackpot',
        coinIn: 1,
        coinOut: 1,
        gamesPlayed: 1,
        gamesWon: 1,
        handPaidCancelledCredits: 1,
      },
    },
    {
      $group: {
        _id: '$machine',
        moneyIn: { $sum: '$drop' },
        moneyOut: { $sum: '$totalCancelledCredits' },
        jackpot: { $sum: '$jackpot' },
        coinIn: { $last: '$coinIn' },
        coinOut: { $last: '$coinOut' },
        gamesPlayed: { $last: '$gamesPlayed' },
        gamesWon: { $last: '$gamesWon' },
        handPaidCancelledCredits: { $last: '$handPaidCancelledCredits' },
        meterCount: { $sum: 1 },
      },
    },
  ];
}

/**
 * Builds the Meters aggregation pipeline for batch processing.
 *
 * @param {string[]} machineIds - Machine IDs to aggregate
 * @param {Date} globalStart - Earliest gaming day start across locations
 * @param {Date} globalEnd - Latest gaming day end across locations
 * @param {string} timePeriod - Current time period
 * @returns {PipelineStage[]} The aggregation pipeline
 */
export function buildBatchMetersPipeline(
  machineIds: string[],
  globalStart: Date,
  globalEnd: Date,
  timePeriod: string
): PipelineStage[] {
  return [
    {
      $match: {
        machine: { $in: machineIds },
        ...(timePeriod !== 'All Time'
          ? { readAt: { $gte: globalStart, $lte: globalEnd } }
          : {}),
      },
    },
    {
      $group: {
        _id: '$machine',
        moneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
        moneyOut: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
        jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
        coinIn: { $last: '$coinIn' },
        coinOut: { $last: '$coinOut' },
        gamesPlayed: { $last: '$gamesPlayed' },
        gamesWon: { $last: '$gamesWon' },
        handPaidCancelledCredits: { $last: '$handPaidCancelledCredits' },
        meterCount: { $sum: 1 },
        minReadAt: { $min: '$readAt' },
        maxReadAt: { $max: '$readAt' },
      },
    },
  ];
}

// ============================================================================
// Default Metrics Factory
// ============================================================================

/**
 * Returns a zeroed-out metrics object for machines with no meter data.
 *
 * @returns {MachineMetrics} Zeroed metrics
 */
export function getDefaultMetrics(): MachineMetrics {
  return {
    moneyIn: 0,
    moneyOut: 0,
    jackpot: 0,
    coinIn: 0,
    coinOut: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    handPaidCancelledCredits: 0,
    meterCount: 0,
  };
}

// ============================================================================
// Offline Status Refinement
// ============================================================================

/**
 * Refines offline status for all machines and applies offline filtering.
 * Calculates offline time labels and applies period-aware filtering.
 *
 * @param {CabinetMachineResponse[]} machines - Machine response array
 * @param {string} onlineStatus - Requested online status filter
 * @param {string} timePeriod - Current time period
 * @param {Map<string, { rangeStart: Date; rangeEnd: Date }>} gamingDayRanges - Per-location gaming day ranges
 * @returns {CabinetMachineResponse[]} Filtered and annotated machines
 */
export function refineOfflineStatus(
  machines: CabinetMachineResponse[],
  onlineStatus: string,
  timePeriod: string,
  gamingDayRanges: Map<string, { rangeStart: Date; rangeEnd: Date }>
): CabinetMachineResponse[] {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

  let refinedMachines = machines.map(machine => {
    const lastActivity = machine.lastActivity
      ? new Date(machine.lastActivity)
      : null;
    const aceEnabled = machine.aceEnabled === true;
    // WOW machines have no SMIB/relay but are always treated as online.
    const isOnline =
      isWowMachine(machine) ||
      aceEnabled ||
      (lastActivity && lastActivity > threeMinutesAgo);

    let offlineTimeLabel: string | undefined = undefined;
    let actualOfflineTime: string | undefined = undefined;

    if (!isOnline && lastActivity) {
      const actualDuration = formatDistanceToNow(lastActivity, {
        addSuffix: true,
      });
      actualOfflineTime = actualDuration;
      offlineTimeLabel = actualDuration;
    } else if (!isOnline && !lastActivity) {
      actualOfflineTime = 'Never';
      offlineTimeLabel = 'Never';
    }

    return {
      ...machine,
      online: !!isOnline,
      offlineTimeLabel,
      actualOfflineTime,
    };
  });

  if (onlineStatus.startsWith('offline')) {
    refinedMachines = refinedMachines.filter(machine => {
      const lastActivity = machine.lastActivity
        ? new Date(machine.lastActivity)
        : null;
      const aceEnabled = machine.aceEnabled === true;
      const isOnline =
        isWowMachine(machine) ||
        aceEnabled ||
        (lastActivity && lastActivity > threeMinutesAgo);
      machine.online = !!isOnline;

      if (isOnline) return false;

      const range = gamingDayRanges.get(String(machine.locationId));
      if (!range) return true;

      if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
        if (!lastActivity) return false;
        return (
          lastActivity >= range.rangeStart && lastActivity <= range.rangeEnd
        );
      } else {
        return !lastActivity || lastActivity <= range.rangeEnd;
      }
    });
  }

  return refinedMachines;
}

// ============================================================================
// Reviewer Scale Application
// ============================================================================

/**
 * Applies reviewer multiplier to financial values for all machines.
 *
 * @param {CabinetMachineResponse[]} machines - Machine response array
 * @param {number} moneyInScale - Scale factor for money in
 * @param {number} moneyOutScale - Scale factor for money out and jackpot
 * @returns {CabinetMachineResponse[]} Scaled machines
 */
export function applyReviewerScale(
  machines: CabinetMachineResponse[],
  moneyInScale: number,
  moneyOutScale: number
): CabinetMachineResponse[] {
  if (moneyInScale === 1 && moneyOutScale === 1) return machines;

  return machines.map(machine => {
    const scaledMoneyIn = machine.moneyIn * moneyInScale;
    const scaledMoneyOut = machine.moneyOut * moneyOutScale;
    const scaledJackpot = machine.jackpot * moneyOutScale;
    const scaledCancelledCredits = machine.cancelledCredits * moneyOutScale;
    return {
      ...machine,
      moneyIn: scaledMoneyIn,
      moneyOut: scaledMoneyOut,
      jackpot: scaledJackpot,
      cancelledCredits: scaledCancelledCredits,
      gross: scaledMoneyIn - scaledMoneyOut,
      netGross: scaledMoneyIn - scaledCancelledCredits - scaledJackpot,
    };
  });
}

// ============================================================================
// Machine Sorting
// ============================================================================

/**
 * Sorts cabinet machines by search relevance, online priority, and configurable field.
 *
 * @param {CabinetMachineResponse[]} machines - Machines to sort (mutated in place)
 * @param {string} searchTerm - Current search term for relevance sorting
 * @param {string} sortBy - Field to sort by
 * @param {number} sortOrder - 1 for ascending, -1 for descending
 */
export function sortCabinetMachines(
  machines: CabinetMachineResponse[],
  searchTerm: string,
  sortBy: string,
  sortOrder: number
): void {
  machines.sort((a, b) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const aSerial = String(a.serialNumber || '').toLowerCase();
      const bSerial = String(b.serialNumber || '').toLowerCase();
      const aName = String(
        (a.custom as { name?: string })?.name || ''
      ).toLowerCase();
      const bName = String(
        (b.custom as { name?: string })?.name || ''
      ).toLowerCase();

      const aStarts =
        aSerial.startsWith(searchLower) || aName.startsWith(searchLower);
      const bStarts =
        bSerial.startsWith(searchLower) || bName.startsWith(searchLower);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    }

    const aOnline = a.online === true;
    const bOnline = b.online === true;

    if (sortBy === 'offlineTime') {
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      if (aOnline && bOnline) return 0;

      const aTime = a.lastActivity
        ? new Date(a.lastActivity).getTime()
        : 0;
      const bTime = b.lastActivity
        ? new Date(b.lastActivity).getTime()
        : 0;

      if (aTime === 0 && bTime > 0) return 1;
      if (aTime > 0 && bTime === 0) return -1;
      if (aTime === 0 && bTime === 0) return 0;

      return (aTime < bTime ? 1 : -1) * sortOrder;
    }

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    const valA = (a as Record<string, unknown>)[sortBy];
    const valB = (b as Record<string, unknown>)[sortBy];

    const safeA = valA === undefined || valA === null ? 0 : valA;
    const safeB = valB === undefined || valB === null ? 0 : valB;

    if (typeof safeA === 'string' && typeof safeB === 'string') {
      return sortOrder === 1
        ? safeA.localeCompare(safeB)
        : safeB.localeCompare(safeA);
    }

    const numA = Number(safeA);
    const numB = Number(safeB);

    if (!isNaN(numA) && !isNaN(numB)) {
      return sortOrder === 1 ? numA - numB : numB - numA;
    }

    return 0;
  });
}

// ============================================================================
// Location Range Helpers
// ============================================================================

/**
 * Builds location data for gaming day range calculation.
 *
 * @param {LocationDocument[]} locations - Fetched locations
 * @param {Map<string, boolean>} licenceeIncludeJackpotMap - Licencee jackpot settings
 * @returns {LocationWithRange[]} Location data with offset and jackpot settings
 */
export function buildLocationRangeInputs(
  locations: LocationDocument[],
  licenceeIncludeJackpotMap: Map<string, boolean>
): LocationWithRange[] {
  return locations.map(loc => {
    const locRecord = loc as unknown as Record<string, unknown>;
    const rel = locRecord.rel as Record<string, unknown> | undefined;
    const licenceeId = Array.isArray(rel?.licencee)
      ? (rel?.licencee as string[])[0]
      : (rel?.licencee as string | undefined);
    return {
      _id: String(locRecord._id),
      gameDayOffset: (locRecord.gameDayOffset as number) ?? 8,
      includeJackpot: licenceeId
        ? licenceeIncludeJackpotMap.get(String(licenceeId)) || false
        : false,
    };
  });
}
