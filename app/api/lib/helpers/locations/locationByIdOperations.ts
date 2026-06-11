/**
 * Location-by-ID Operations Helpers
 *
 * Business logic for the GET /api/locations/[locationId] endpoint.
 * Handles SMIB auto-tagging, machine filter building, meter aggregation,
 * cabinet mapping, sorting, and pagination.
 *
 * @module app/api/lib/helpers/locations/locationByIdOperations
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import type {
  GamingMachine,
  LicenceeDocument,
  TransformedCabinet,
} from '@shared/types';
import { getMoneyInScale, getMoneyOutAndJackpotScale } from '@/app/api/lib/utils/reviewerScale';

// ============================================================================
// Types
// ============================================================================

export type SmibTagResult = {
  fullSMIBs: boolean;
  semiSMIBs: boolean;
  noSMIBLocation: boolean;
};

export type CabinetsFilterParams = {
  locationId: string;
  includeArchived: boolean;
  onlineStatus: string;
  smibStatus: string;
  aceEnabled: boolean;
};

export type MachineMetricsRecord = {
  _id: string;
  moneyIn: number;
  moneyOut: number;
  jackpot: number;
  gamesPlayed: number;
  gamesWon: number;
  gross: number;
};

type MachineMetricsMap = Map<
  string,
  {
    moneyIn: number;
    moneyOut: number;
    gross: number;
    jackpot: number;
    gamesPlayed: number;
    gamesWon: number;
  }
>;

export type CabinetItemData = {
  _id: string;
  locationId: string;
  locationName: string;
  assetNumber: string;
  serialNumber: string;
  custom: Record<string, unknown>;
  relayId: string;
  smibBoard: string;
  smbId: string;
  lastActivity: Date | null;
  lastOnline: Date | null;
  game: string;
  installedGame: string;
  manufacturer: string;
  cabinetType: string;
  status: string;
  gameType: string;
  isCronosMachine: boolean;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  jackpot: number;
  gamesPlayed: number;
  gamesWon: number;
  cancelledCredits: number;
  sasMeters: Record<string, unknown> | null;
  online: boolean;
  includeJackpot: boolean;
  deletedAt: Date | null;
};

export type CabinetMappingContext = {
  locationId: string;
  locationName: string;
  aceEnabled: boolean;
  moneyInScale: number;
  moneyOutScale: number;
  includeJackpotSetting: boolean;
};

export type PaginatedCabinetResult = {
  data: TransformedCabinet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

// ============================================================================
// Constants
// ============================================================================

const CABINET_ONLINE_THRESHOLD_MS = 3 * 60 * 1000;
const DELETION_SOFT_CUTOFF = new Date('2025-01-01');

// ============================================================================
// 1. SMIB Auto-Tag
// ============================================================================

/**
 * Computes SMIB classification (fullSMIBs / semiSMIBs / noSMIBLocation) for
 * a location based on its active machines' relayId presence. Updates the DB
 * record and returns the computed flags for immediate response use.
 */
export async function computeAndUpdateSmibTags(
  locationId: string,
  locationName: string
): Promise<SmibTagResult> {
  const activeMachinesForTag = await Machine.find(
    {
      gamingLocation: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: DELETION_SOFT_CUTOFF } },
      ],
    },
    { _id: 1, relayId: 1 }
  ).lean<{ _id: string; relayId?: string }[]>();

  const totalForTag = activeMachinesForTag.length;
  const withRelayForTag = activeMachinesForTag.filter(
    m => m.relayId && String(m.relayId).trim()
  ).length;
  const withoutRelayForTag = totalForTag - withRelayForTag;

  const computedFull = totalForTag > 0 && withRelayForTag === totalForTag;
  const computedSemi =
    totalForTag > 0 && withRelayForTag > 0 && withRelayForTag < totalForTag;
  const computedNone = !computedFull && !computedSemi;

  const computedType = computedFull
    ? 'fullSMIBs'
    : computedSemi
      ? 'semiSMIBs'
      : 'noSMIBLocation';

  console.log(
    `[GET /api/locations/[locationId]] SMIB check for "${locationName}" (${locationId}) — ` +
      `total machines: ${totalForTag}, with relayId: ${withRelayForTag}, without relayId: ${withoutRelayForTag} → computed: ${computedType}`
  );

  GamingLocations.updateOne(
    { _id: locationId },
    {
      $set: {
        fullSMIBs: computedFull,
        semiSMIBs: computedSemi,
        noSMIBLocation: computedNone,
      },
    }
  )
    .then(result => {
      console.log(
        `[GET /api/locations/[locationId]] "${locationName}" — update complete, modified: ${result.modifiedCount}`
      );
    })
    .catch(err => {
      console.error(
        `[GET /api/locations/[locationId]] "${locationName}" — update failed:`,
        err
      );
    });

  return { fullSMIBs: computedFull, semiSMIBs: computedSemi, noSMIBLocation: computedNone };
}

// ============================================================================
// 2. Fetch Licencee Jackpot Flag
// ============================================================================

/**
 * Resolves the includeJackpot setting from a location's licencee reference.
 * Accepts a single licencee ID or array (uses first element).
 */
export async function fetchLicenceeJackpotFlag(
  locLicId: string | string[] | undefined
): Promise<boolean> {
  if (!locLicId) return false;
  const licenceeId = Array.isArray(locLicId) ? locLicId[0] : locLicId;
  if (!licenceeId) return false;
  const licDoc = await Licencee.findOne(
    { _id: licenceeId },
    { includeJackpot: 1 }
  ).lean<LicenceeDocument>();
  return Boolean(licDoc?.includeJackpot);
}

// ============================================================================
// 3. Build Machine Filter for Cabinets List
// ============================================================================

/**
 * Builds a MongoDB query filter for fetching machines belonging to a location.
 * Applies archive, online-status, and SMIB-status filters conditionally.
 */
export function buildMachinesFilter(params: CabinetsFilterParams): Record<string, unknown> {
  const mMatch: Record<string, unknown> = {
    $and: [{ gamingLocation: params.locationId }] as unknown[],
  };
  const andConditions = mMatch.$and as unknown[];

  if (!params.includeArchived) {
    andConditions.push({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: DELETION_SOFT_CUTOFF } },
      ],
    });
  } else {
    andConditions.push({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: true } }],
    });
  }

  if (params.onlineStatus !== 'all') {
    const threeMin = new Date(Date.now() - CABINET_ONLINE_THRESHOLD_MS);
    if (params.aceEnabled) {
      if (params.onlineStatus === 'online') {
        // All active machines are online in ACE locations
      } else if (params.onlineStatus === 'offline' || params.onlineStatus === 'never-online') {
        andConditions.push({ _id: null });
      }
    } else {
      if (params.onlineStatus === 'online') {
        (mMatch as Record<string, unknown>).lastActivity = { $gte: threeMin };
      } else if (params.onlineStatus === 'offline') {
        andConditions.push({
          $or: [
            { lastActivity: { $lt: threeMin } },
            { lastActivity: { $exists: false } },
            { lastActivity: null },
          ],
        });
      } else if (params.onlineStatus === 'never-online') {
        andConditions.push({
          $or: [
            { lastActivity: { $exists: false } },
            { lastActivity: null },
          ],
        });
      }
    }
  }

  if (params.smibStatus !== 'all') {
    if (params.smibStatus === 'smib') {
      andConditions.push({
        $or: [
          { relayId: { $ne: '', $exists: true, $not: /^\s*$/ } },
          { smibBoard: { $ne: '', $exists: true, $not: /^\s*$/ } },
        ],
      });
    } else if (params.smibStatus === 'no-smib') {
      andConditions.push({
        $and: [
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

  return mMatch;
}

// ============================================================================
// 4. Compute Reviewer Scales
// ============================================================================

/**
 * Computes reviewer moneyIn and moneyOut scales for the time period.
 * Returns { moneyInScale: number; moneyOutScale: number } with values
 * between 0 and 1 (1 = no scaling).
 */
export function computeReviewerScales(
  userPayload: {
    moneyInMultiplier?: number | null;
    moneyOutAndJackpotMultiplier?: number | null;
    roles?: string[];
    reviewerMultiplierStartTime?: Date | string | null;
  },
  rangeEnd: Date
): { moneyInScale: number; moneyOutScale: number } {
  const moneyInScale = getMoneyInScale(userPayload, rangeEnd);
  const moneyOutScale = getMoneyOutAndJackpotScale(userPayload, rangeEnd);
  return { moneyInScale, moneyOutScale };
}

// ============================================================================
// 5. Fetch Machine Metrics with Cursor
// ============================================================================

/**
 * Aggregates meter data for the given machine IDs and time range.
 * Uses cursor-based iteration for large result sets.
 */
export async function fetchMachineMetrics(
  locationId: string,
  machineIds: string[],
  rangeStart: Date,
  rangeEnd: Date
): Promise<MachineMetricsRecord[]> {
  const rawMachineMetrics: MachineMetricsRecord[] = [];
  const cursor = Meters.aggregate([
    {
      $match: {
        $and: [
          { location: locationId },
          { machine: { $in: machineIds } },
          { readAt: { $gte: rangeStart, $lte: rangeEnd } },
        ],
      },
    },
    {
      $group: {
        _id: '$machine',
        moneyIn: { $sum: '$movement.drop' },
        moneyOut: { $sum: '$movement.totalCancelledCredits' },
        jackpot: { $sum: '$movement.jackpot' },
        gamesPlayed: { $sum: '$movement.gamesPlayed' },
        gamesWon: { $sum: '$movement.gamesWon' },
      },
    },
    { $addFields: { gross: { $subtract: ['$moneyIn', '$moneyOut'] } } },
  ]).cursor({ batchSize: 1000 });

  for await (const doc of cursor) {
    rawMachineMetrics.push(doc as MachineMetricsRecord);
  }

  return rawMachineMetrics;
}

/**
 * Converts a raw metrics array into a Map keyed by machine _id for O(1) lookup.
 */
export function buildMetricsMap(
  records: MachineMetricsRecord[]
): MachineMetricsMap {
  const map: MachineMetricsMap = new Map();
  for (const record of records) {
    map.set(String(record._id), {
      moneyIn: record.moneyIn,
      moneyOut: record.moneyOut,
      gross: record.gross,
      jackpot: record.jackpot,
      gamesPlayed: record.gamesPlayed,
      gamesWon: record.gamesWon,
    });
  }
  return map;
}

// ============================================================================
// 6. Map Machines to Cabinet Items
// ============================================================================

/**
 * Maps raw GamingMachine documents + aggregated metrics into CabinetItemData
 * objects with computed financials and online status.
 */
export function mapMachinesToCabinetData(
  machines: GamingMachine[],
  metricsMap: MachineMetricsMap,
  context: CabinetMappingContext
): CabinetItemData[] {
  return machines.map(machine => {
    const currentMachineId = String(machine._id);
    const machineMeters = metricsMap.get(currentMachineId) || {
      moneyIn: 0,
      moneyOut: 0,
      gross: 0,
      jackpot: 0,
      gamesPlayed: 0,
      gamesWon: 0,
    };
    const serialNumber = (machine.serialNumber as string)?.trim() || '';
    const customName =
      ((machine.custom as unknown as { name?: string })?.name as string)?.trim() || '';
    const assetNumber = serialNumber || customName || '';
    const lastActivityDate = machine.lastActivity as Date | null;
    const isOnline =
      context.aceEnabled ||
      (lastActivityDate &&
        new Date(lastActivityDate) > new Date(Date.now() - CABINET_ONLINE_THRESHOLD_MS));
    const rawMoneyIn = (Number(machineMeters.moneyIn) || 0) * context.moneyInScale;
    const rawMoneyOut = (Number(machineMeters.moneyOut) || 0) * context.moneyOutScale;
    const rawJackpot = (Number(machineMeters.jackpot) || 0) * context.moneyOutScale;
    const adjustedMoneyOut = rawMoneyOut + (context.includeJackpotSetting ? rawJackpot : 0);
    const grossProfit = rawMoneyIn - adjustedMoneyOut;

    return {
      _id: currentMachineId,
      locationId: context.locationId,
      locationName: context.locationName,
      assetNumber,
      serialNumber: assetNumber,
      custom: (machine.custom || {}) as Record<string, unknown>,
      relayId: (machine.relayId as string) || '',
      smibBoard: (machine.smibBoard as string) || '',
      smbId: (machine.smibBoard as string) || (machine.relayId as string) || '',
      lastActivity: lastActivityDate,
      lastOnline: lastActivityDate,
      game: (machine.game as string) || '',
      installedGame: (machine.game as string) || '',
      manufacturer:
        (machine.manufacturer as string) || (machine.manuf as string) || 'Unknown',
      cabinetType: (machine.cabinetType as string) || '',
      status: (machine.assetStatus as string) || '',
      gameType: (machine.gameType as string) || '',
      isCronosMachine: !!machine.isCronosMachine,
      moneyIn: rawMoneyIn,
      moneyOut: adjustedMoneyOut,
      gross: grossProfit,
      jackpot: rawJackpot,
      gamesPlayed: Number(machineMeters.gamesPlayed) || 0,
      gamesWon: Number(machineMeters.gamesWon) || 0,
      cancelledCredits: adjustedMoneyOut,
      sasMeters: (machine.sasMeters || null) as Record<string, unknown> | null,
      online: !!isOnline,
      includeJackpot: context.includeJackpotSetting,
      deletedAt: (machine as unknown as { deletedAt?: Date }).deletedAt || null,
    };
  });
}

// ============================================================================
// 7. Sort Cabinet Items
// ============================================================================

/**
 * Multi-level sort: search prefix relevance → online status → gross descending → serial number.
 * Mutates the array in place.
 */
export function sortCabinetData(
  items: CabinetItemData[],
  searchTerm?: string
): void {
  items.sort((a, b) => {
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const aStarts = a.serialNumber.toLowerCase().startsWith(lowerSearch);
      const bStarts = b.serialNumber.toLowerCase().startsWith(lowerSearch);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    }

    if (a.online && !b.online) return -1;
    if (!a.online && b.online) return 1;

    const bGross = Number(b.gross) || 0;
    const aGross = Number(a.gross) || 0;
    if (bGross !== aGross) return bGross - aGross;

    return a.serialNumber.localeCompare(b.serialNumber);
  });
}

// ============================================================================
// 8. Paginate and Transform to TransformedCabinet
// ============================================================================

/**
 * Applies pagination slicing and transforms CabinetItemData to TransformedCabinet
 * (adds netGross and metersData fields).
 */
export function paginateAndTransformCabinets(
  items: CabinetItemData[],
  page: number,
  limit: number | undefined,
  skip: number
): PaginatedCabinetResult {
  const total = items.length;
  const paginated = limit ? items.slice(skip, skip + limit) : items;

  const data: TransformedCabinet[] = paginated.map(item => {
    const currentGross = Number(item.gross) || 0;
    const currentJackpot = Number(item.jackpot) || 0;
    return {
      ...item,
      netGross: item.includeJackpot ? currentGross - currentJackpot : undefined,
      metersData: null,
    } as unknown as TransformedCabinet;
  });

  const totalPages = limit ? Math.ceil(total / limit) : 1;

  return {
    data,
    pagination: {
      page,
      limit: limit || total,
      total,
      totalPages,
      hasNextPage: limit ? page < totalPages : false,
      hasPrevPage: page > 1,
    },
  };
}

// ============================================================================
// 9. Filter Machines by Search Term
// ============================================================================

/**
 * Filters machines array by search term (case-insensitive match on
 * serialNumber, relayId, smibBoard, custom name, or _id).
 */
export function filterMachinesBySearch(
  machines: GamingMachine[],
  searchTerm: string
): GamingMachine[] {
  const lowerSearchTerm = searchTerm.toLowerCase();
  return machines.filter(
    machine =>
      machine.serialNumber?.toLowerCase().includes(lowerSearchTerm) ||
      machine.relayId?.toLowerCase().includes(lowerSearchTerm) ||
      machine.smibBoard?.toLowerCase().includes(lowerSearchTerm) ||
      ((machine.custom as unknown as { name?: string })?.name || '')
        .toLowerCase()
        .includes(lowerSearchTerm) ||
      String(machine._id).toLowerCase().includes(lowerSearchTerm)
  );
}
