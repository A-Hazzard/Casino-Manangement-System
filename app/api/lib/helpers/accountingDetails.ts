import type {
  AcceptedBill as AcceptedBillType,
  MachineEvent as MachineEventType,
} from '@/lib/types/api';
import { CollectionReportData } from '@/lib/types/api';
import type { CollectionMetersHistoryEntry } from '@/shared/types';
import type { TimePeriod } from '@/shared/types/common';
import type {
  CollectionDocument,
  CollectionReportDocument,
  GamingMachine,
} from '@/shared/types';
import { AcceptedBill } from '../models/acceptedBills';
import { CollectionReport } from '../models/collectionReport';
import { Collections } from '../models/collections';
import { GamingLocations } from '../models/gaminglocations';
import { MachineEvent } from '../models/machineEvents';
import { Machine } from '../models/machines';
import { aggregateMeterDataForWindows } from './collectionReport/variation';
import { isWowMachine } from '@/shared/utils/wowMachine';
import { getDatesForTimePeriod } from '../utils/dates';
import { logRoutePhase } from '../utils/routeLogger';
import {
  getMoneyInScale,
  getMoneyOutAndJackpotScale,
  scaleMachineValues,
} from '../utils/reviewerScale';
import type { JwtPayload } from '@/shared/types/auth';

type UserWithMultiplier = JwtPayload & {
  moneyInMultiplier?: number | null;
  moneyOutAndJackpotMultiplier?: number | null;
  reviewerMultiplierStartTime?: Date | string | null;
};

/**
 * Formats a number with smart decimal handling
 */
const formatSmartDecimal = (value: number): string => {
  if (isNaN(value)) return '0';
  const absValue = Math.abs(value);
  const hasDecimals = absValue % 1 !== 0;
  const decimalPart = absValue % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;
  return value.toFixed(hasSignificantDecimals ? 2 : 0);
};

/**
 * Fetches accepted bills for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of AcceptedBillType.
 */
async function getAcceptedBillsByMachine(
  machineId: string,
  timePeriod?: string | null
): Promise<AcceptedBillType[]> {
  try {
    const query: Record<string, unknown> = { machine: machineId };

    // Apply date filtering if timePeriod is provided
    if (timePeriod && timePeriod !== 'All Time') {
      const dateRange = getDatesForTimePeriod(timePeriod as TimePeriod);
      if (dateRange.startDate && dateRange.endDate) {
        query.createdAt = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }
    }

    const result = await AcceptedBill.find(query).lean<AcceptedBillType[]>();

    return result;
  } catch (error) {
    console.error(
      '[getAcceptedBillsByMachine] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return [];
  }
}

/**
 * Fetches machine events for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of MachineEventType.
 */
async function getMachineEventsByMachine(
  machineId: string,
  timePeriod?: string | null
): Promise<MachineEventType[]> {
  try {
    // Check if MachineEvent model is properly initialized
    if (!MachineEvent || typeof MachineEvent.find !== 'function') {
      console.error(
        '[API] getMachineEventsByMachine: MachineEvent model is not properly initialized'
      );
      // Return empty array instead of mock data
      return [];
    }

    const query: Record<string, unknown> = { machine: machineId };

    // Apply date filtering if timePeriod is provided
    if (timePeriod && timePeriod !== 'All Time') {
      const dateRange = getDatesForTimePeriod(timePeriod as TimePeriod);
      if (dateRange.startDate && dateRange.endDate) {
        query.timestamp = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }
    }

    const result = await MachineEvent.find(query).lean<MachineEventType[]>();

    // If no results, return empty array
    if (!result || result.length === 0) {
      return [];
    }

    return result;
  } catch (error) {
    console.error(
      '[API] getMachineEventsByMachine: error fetching data',
      error
    );
    return [];
  }
}

/**
 * Fetches collection meters history for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of CollectionMetersHistoryEntry.
 */
async function getCollectionMetersHistoryByMachine(
  machineId: string,
  timePeriod?: string | null
): Promise<CollectionMetersHistoryEntry[]> {
  try {
    // Use findOne with specific projection for collectionMetersHistory
    const query = { _id: machineId };
    const projection = { collectionMetersHistory: 1 };

    const machine = await Machine.findOne(query, projection).lean<
      Record<string, unknown>
    >();

    let result = (machine?.collectionMetersHistory ||
      []) as CollectionMetersHistoryEntry[];

    // Apply date filtering if timePeriod is provided
    if (timePeriod && timePeriod !== 'All Time') {
      const dateRange = getDatesForTimePeriod(timePeriod as TimePeriod);
      if (dateRange.startDate && dateRange.endDate) {
        result = result.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          return (
            entryDate >= dateRange.startDate! && entryDate <= dateRange.endDate!
          );
        });
      }
    }

    return result;
  } catch (error) {
    console.error(
      '[getCollectionMetersHistoryByMachine] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return [];
  }
}

/**
 * Fetches all accounting details for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an object with acceptedBills, machineEvents, collectionMetersHistory, and machine.
 */
export async function getAccountingDetails(
  machineId: string,
  timePeriod?: string | null
) {
  if (!machineId) {
    console.error('[getAccountingDetails] machineId is required');
    return {
      acceptedBills: [],
      machineEvents: [],
      collectionMetersHistory: [],
      machine: null,
    };
  }
  const [acceptedBills, machineEvents, collectionMetersHistory, machine] =
    await Promise.all([
      getAcceptedBillsByMachine(machineId, timePeriod),
      getMachineEventsByMachine(machineId, timePeriod),
      getCollectionMetersHistoryByMachine(machineId, timePeriod),
      Machine.findOne({ _id: machineId }).lean<GamingMachine>(),
    ]);

  return { acceptedBills, machineEvents, collectionMetersHistory, machine };
}

// ============================================================================
// Collection Report Detail Helpers
// ============================================================================

/**
 * Fetches the location's noSMIBLocation flag and its licencee's includeJackpot flag.
 * Returns safe defaults on missing location or error.
 */
async function fetchLocationLicenceeFlags(
  locationId?: string
): Promise<{ includeJackpot: boolean; isNoSMIBLocation: boolean }> {
  if (!locationId) return { includeJackpot: false, isNoSMIBLocation: false };

  try {
    const location = await GamingLocations.findOne(
      { _id: locationId },
      { 'rel.licencee': 1, noSMIBLocation: 1 }
    ).lean<{
      rel?: { licencee?: string };
      noSMIBLocation?: boolean;
    } | null>();

    const isNoSMIBLocation = location?.noSMIBLocation === true;
    const licenceeId = location?.rel?.licencee;

    let includeJackpot = false;
    if (licenceeId) {
      const { Licencee } = await import('@/app/api/lib/models/licencee');
      const licenceeDoc = await Licencee.findOne(
        { _id: licenceeId },
        { includeJackpot: 1 }
      ).lean<Record<string, unknown> | null>();
      includeJackpot = Boolean(licenceeDoc?.includeJackpot);
    }

    return { includeJackpot, isNoSMIBLocation };
  } catch (err) {
    console.error(
      '[getCollectionReportById] Could not fetch licencee includeJackpot:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return { includeJackpot: false, isNoSMIBLocation: false };
  }
}

/**
 * Counts active machines for a location, returning the provided fallback on error.
 */
async function countMachinesForLocation(
  locationId: string | undefined,
  fallback: number
): Promise<number> {
  if (!locationId) return fallback;

  try {
    return await Machine.countDocuments({
      gamingLocation: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    });
  } catch (error) {
    console.error(
      '[getAccountingDetails] Could not count total machines for location:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return fallback;
  }
}

/**
 * Resolves the human-readable collector name for a report, looking up the user
 * document when only an id is stored. Falls back to "Deleted User" for id-shaped
 * collectors that no longer resolve, or the raw collector value otherwise.
 */
async function resolveCollectorName(
  report: CollectionReportDocument
): Promise<string> {
  let collectorName = report.collectorName || '';
  if (!report.collector) return collectorName;

  try {
    const UserModel = (await import('@/app/api/lib/models/user')).default;
    const collectorUser = await UserModel.findOne({
      _id: report.collector,
    }).lean<{
      username?: string;
      profile?: { firstName?: string; lastName?: string };
      emailAddress?: string;
    } | null>();
    if (collectorUser) {
      if (collectorUser.username) {
        collectorName = collectorUser.username;
      } else if (collectorUser.profile?.firstName) {
        collectorName = collectorUser.profile.firstName;
      } else if (collectorUser.emailAddress) {
        collectorName = collectorUser.emailAddress;
      }
    } else if (
      /^[0-9a-fA-F]{24}$/.test(report.collector) ||
      report.collector.startsWith('user_') ||
      report.collector.length > 15
    ) {
      collectorName = 'Deleted User';
    } else {
      collectorName = report.collector;
    }
  } catch (err) {
    console.warn(
      '[getCollectionReportById] Failed to look up collector user:',
      err
    );
  }

  return collectorName;
}

/**
 * Fetches and formats a collection report by its reportId.
 * @param reportId - The unique report ID to fetch.
 * @param currentUser - The authenticated user with multiplier from DB.
 * @param preloadedReport - Optional already-fetched report to avoid a redundant query.
 * @returns Promise resolving to a CollectionReportData object or null if not found.
 */
export async function getCollectionReportById(
  reportId: string,
  currentUser: UserWithMultiplier,
  preloadedReport?: CollectionReportDocument | null
): Promise<CollectionReportData | null> {
  if (!reportId || !currentUser) {
    console.error(
      '[getCollectionReportById] reportId and currentUser are required'
    );
    return null;
  }

  // Per-phase timing so server logs show progress through this multi-step query.
  const phaseStart = Date.now();
  const PHASE_FN = 'getCollectionReportById';

  // Reuse the report already fetched by the caller (the [reportId] route) when
  // provided, avoiding a redundant findOne on the hot path.
  const report =
    preloadedReport ??
    (await CollectionReport.findOne({
      locationReportId: reportId,
    }).lean<CollectionReportDocument>());
  if (!report) return null;
  logRoutePhase(PHASE_FN, 'report fetched', Date.now() - phaseStart, reportId);

  // Get multipliers from user for reviewer calculations
  const moneyInScale = getMoneyInScale(currentUser, report.timestamp);
  const moneyOutScale = getMoneyOutAndJackpotScale(
    currentUser,
    report.timestamp
  );

  // Resolve collector name and fetch collections concurrently — the collector
  // lookup only needs `report`, so it overlaps with the collections query.
  logRoutePhase(
    PHASE_FN,
    'fetching collections + collector — start',
    Date.now() - phaseStart
  );
  const collectorNamePromise = resolveCollectorName(report);

  // Fetch actual collections for this report.
  // Previously this used an aggregation with a $lookup to machines only to populate
  // sasMeters.machine, but that display field is not used downstream. We now fetch
  // collections directly and batch-load machine metadata (relayId/meta) in one query.
  const collectionsPromise = Collections.find(
    { locationReportId: reportId },
    {
      machineId: 1,
      serialNumber: 1,
      machineName: 1,
      machineCustomName: 1,
      'custom.name': 1,
      game: 1,
      metersIn: 1,
      metersOut: 1,
      prevIn: 1,
      prevOut: 1,
      movement: 1,
      sasMeters: 1,
      ramClear: 1,
      notes: 1,
    }
  ).lean<CollectionDocument[]>();

  const [collectorName, collections] = await Promise.all([
    collectorNamePromise,
    collectionsPromise,
  ]);

  logRoutePhase(
    PHASE_FN,
    'collections + collector resolved',
    Date.now() - phaseStart,
    `${collections.length} collections`
  );

  // 🚀 OPTIMIZATION: Batch fetch ALL meter data in ONE query instead of N queries
  // This must be done BEFORE calculating location metrics so we can use it for SAS gross.

  // Collect machineId + SAS time ranges for all collections
  // CRITICAL: Use collection.machineId (_id) as the lookup key.
  // Meters stored by the cabinet/machine page use `machine = machine._id`.
  // Do NOT use sasMeters.machine (display identifier) — it's inconsistent.
  const meterQueries = collections
    .filter(
      collection =>
        collection.machineId &&
        collection.sasMeters?.sasStartTime &&
        collection.sasMeters?.sasEndTime
    )
    .map(collection => ({
      machineId: collection.machineId as string,
      startTime: new Date(collection.sasMeters!.sasStartTime!),
      endTime: new Date(collection.sasMeters!.sasEndTime!),
    }));

  logRoutePhase(
    PHASE_FN,
    'aggregating meters — start',
    Date.now() - phaseStart,
    `${meterQueries.length} meter windows`
  );

  const machineIdsForRelay = collections
    .map(collection => collection.machineId)
    .filter((id): id is string => Boolean(id));

  // Run the four independent reads concurrently: the meter scan, machine relay/meta
  // metadata, the location + licencee includeJackpot flag, and the location machine
  // count. Previously these executed sequentially.
  const [meterDataMap, machineMetaDocs, locationFlags, totalMachinesForLocation] =
    await Promise.all([
      aggregateMeterDataForWindows(meterQueries),
      machineIdsForRelay.length
        ? Machine.find(
            { _id: { $in: machineIdsForRelay } },
            { relayId: 1, meta: 1 }
          ).lean<
            {
              _id: string;
              relayId?: string;
              meta?: { dataSync?: { source?: string } };
            }[]
          >()
        : Promise.resolve(
            [] as {
              _id: string;
              relayId?: string;
              meta?: { dataSync?: { source?: string } };
            }[]
          ),
      fetchLocationLicenceeFlags(report.location),
      countMachinesForLocation(report.location, collections.length),
    ]);

  logRoutePhase(
    PHASE_FN,
    'meters aggregated',
    Date.now() - phaseStart,
    `${meterDataMap.size} machine groups`
  );

  // relayId identifies SMIB-capable machines; meta identifies WOW machines which
  // have synced meter data but no relayId and must be treated as SMIB-equivalent.
  const hasRelayMap = new Map(
    machineMetaDocs.map(doc => [String(doc._id), Boolean(doc.relayId?.trim())])
  );
  const isWowMap = new Map(
    machineMetaDocs.map(doc => [String(doc._id), isWowMachine(doc)])
  );
  const { includeJackpot, isNoSMIBLocation } = locationFlags;

  logRoutePhase(PHASE_FN, 'relay map built', Date.now() - phaseStart);

  // Calculate location metrics from actual collections using the same logic as individual machines
  const totalDrop = collections.reduce((sum, collection) => {
    return sum + ((collection.metersIn || 0) - (collection.prevIn || 0));
  }, 0);

  const totalCancelled = collections.reduce((sum, collection) => {
    return sum + ((collection.metersOut || 0) - (collection.prevOut || 0));
  }, 0);

  const totalMetersGross = collections.reduce((sum, collection) => {
    // Prefer stored movement.gross; fall back to raw delta calculation for older documents
    const storedGross = collection.movement?.gross;
    if (storedGross !== undefined && storedGross !== null) {
      return sum + storedGross;
    }
    // Fallback: same formula as the main list page aggregation
    return (
      sum +
      ((collection.metersIn || 0) -
        (collection.prevIn || 0) -
        ((collection.metersOut || 0) - (collection.prevOut || 0)))
    );
  }, 0);

  // Calculate total SAS gross from meter data map (for display purposes only)
  let totalSasGross = 0;
  for (const collection of collections) {
    if (
      collection.machineId &&
      collection.sasMeters?.sasStartTime &&
      collection.sasMeters?.sasEndTime
    ) {
      const meterData = meterDataMap.get(collection.machineId);
      if (meterData) {
        totalSasGross += meterData.drop - meterData.cancelled;
      }
    }
  }

  // Map location metrics (use calculated values for core metrics, keep report values for financial fields)
  // Money in fields use moneyInScale, money out fields use moneyOutScale
  const totalJackpot = collections.reduce((sum, collection) => {
    const meterData = collection.machineId
      ? meterDataMap.get(collection.machineId)
      : undefined;
    return sum + (meterData?.jackpot ?? collection.sasMeters?.jackpot ?? 0);
  }, 0);
  const scaledGross = totalMetersGross * moneyInScale;
  const scaledJackpot = totalJackpot * moneyOutScale;

  // Compute location total variation by summing per-machine variations.
  // This must use the same logic as the machine metrics loop below (hasSmib, hasNoSasData, includeJackpot).
  // noSMIBLocation does NOT make individual machines appear SMIB-equipped.
  let computedTotalVariation = 0;
  for (const collection of collections) {
    const machineHasSmib =
      (hasRelayMap.get(String(collection.machineId)) ?? false) ||
      (isWowMap.get(String(collection.machineId)) ?? false);
    if (!machineHasSmib) continue;

    const machineMeterGross = collection.movement?.gross ?? 0;
    let machineSasGross = 0;
    let machineJackpot = 0;

    if (
      collection.machineId &&
      collection.sasMeters?.sasStartTime &&
      collection.sasMeters?.sasEndTime
    ) {
      const meterData = meterDataMap.get(collection.machineId);
      if (meterData) {
        machineSasGross = meterData.drop - meterData.cancelled;
        machineJackpot = meterData.jackpot;
      }
    }

    const machineAdjustedSasGross = includeJackpot
      ? machineSasGross - machineJackpot
      : machineSasGross;

    const machineHasNoSasData =
      !collection.sasMeters?.sasStartTime ||
      !collection.sasMeters?.sasEndTime ||
      !meterDataMap.has(String(collection.machineId));

    computedTotalVariation +=
      machineMeterGross - (machineHasNoSasData ? 0 : machineAdjustedSasGross);
  }

  // Self-heal: the stored totalVariation field can diverge from the live
  // computation (e.g. reports created before the unified computeTotalVariation
  // fix). When it diverges, overwrite the stored value and use the live value.
  const storedTotalVariation =
    typeof report.totalVariation === 'number' ? report.totalVariation : 0;
  const liveTotalVariation = computedTotalVariation;
  if (
    Math.abs(storedTotalVariation - liveTotalVariation) > 0.001
  ) {
    console.warn(
      `[accountingDetails] totalVariation mismatch for report ${report.locationReportId}: stored=${storedTotalVariation} live=${liveTotalVariation}. Correcting stored value.`
    );
    CollectionReport.findOneAndUpdate(
      { locationReportId: report.locationReportId },
      { $set: { totalVariation: Number(liveTotalVariation.toFixed(2)) } }
    ).catch(err => {
      console.error(
        '[accountingDetails] Failed to correct totalVariation:',
        err instanceof Error ? err.message : 'Unknown error'
      );
    });
  }

  const locationMetrics = {
    droppedCancelled: `${formatSmartDecimal(totalDrop * moneyInScale)} / ${formatSmartDecimal(totalCancelled * moneyOutScale)}`,
    metersGross: scaledGross,
    jackpot: scaledJackpot,
    netGross: scaledGross - scaledJackpot,
    variation: liveTotalVariation * moneyInScale,
    sasGross: totalSasGross * moneyInScale,
    locationRevenue: (report.partnerProfit || 0) * moneyInScale,
    amountUncollected: (report.amountUncollected || 0) * moneyInScale,
    amountToCollect: (report.amountToCollect || 0) * moneyInScale,
    machinesNumber: `${collections.length}/${totalMachinesForLocation}`,
    collectedAmount: (report.amountCollected || 0) * moneyInScale,
    reasonForShortage: report.reasonShortagePayment || '-',
    taxes: (report.taxes || 0) * moneyOutScale,
    advance: (report.advance || 0) * moneyOutScale,
    previousBalanceOwed: (report.previousBalance || 0) * moneyOutScale,
    balanceCorrection: (report.balanceCorrection || 0) * moneyOutScale,
    currentBalanceOwed: (report.currentBalance || 0) * moneyOutScale,
    correctionReason: report.balanceCorrectionReas || '-',
    variance:
      typeof report.variance === 'number'
        ? report.variance * moneyInScale
        : report.variance || '-',
    varianceReason: report.varianceReason || '-',
  };

  // Calculate SAS-specific metrics from meter data map (same method as machine metrics)
  // This ensures consistency and uses the actual calculated values from meters
  let sasDropTotal = 0;
  let sasCancelledTotal = 0;
  let sasGrossTotal = 0;

  for (const collection of collections) {
    if (
      collection.machineId &&
      collection.sasMeters?.sasStartTime &&
      collection.sasMeters?.sasEndTime
    ) {
      const meterData = meterDataMap.get(collection.machineId);
      if (meterData) {
        sasDropTotal += meterData.drop;
        sasCancelledTotal += meterData.cancelled;
        sasGrossTotal += meterData.drop - meterData.cancelled;
      }
    }
  }

  // Map SAS metrics from meter data map (calculated above)
  const sasMetrics = {
    dropped: sasDropTotal * moneyInScale,
    cancelled: sasCancelledTotal * moneyOutScale,
    gross: sasGrossTotal * moneyInScale,
  };

  logRoutePhase(
    PHASE_FN,
    'metrics calculated — done',
    Date.now() - phaseStart,
    `${collections.length} machines`
  );

  // Derive timeframe from collections
  const sasStartTimes = collections
    .map(c => c.sasMeters?.sasStartTime)
    .filter((t): t is Date => !!t);
  const sasEndTimes = collections
    .map(c => c.sasMeters?.sasEndTime)
    .filter((t): t is Date => !!t);
  const timeframeStart = sasStartTimes.length
    ? new Date(Math.min(...sasStartTimes.map(t => t.getTime()))).toISOString()
    : undefined;
  const timeframeEnd = sasEndTimes.length
    ? new Date(Math.max(...sasEndTimes.map(t => t.getTime()))).toISOString()
    : undefined;

  return {
    reportId: report.locationReportId || '',
    locationName: report.locationName || '',
    collectionDate: report.timestamp
      ? new Date(report.timestamp).toISOString()
      : '-',
    createdAt: (report as Record<string, unknown>).createdAt
      ? new Date((report as Record<string, unknown>).createdAt as Date).toISOString()
      : undefined,
    timeframeStart,
    timeframeEnd,
    deletedAt: report.deletedAt?.toISOString() || null,
    includeJackpot: includeJackpot,
    useNetGross: includeJackpot,
    collector: report.collector,
    collectorName: collectorName,
    machineMetrics: collections.map((collection, idx: number) => {
      // Get machine identifier with priority: serialNumber -> machineName -> machineCustomName -> machineId
      // Get raw values with fallbacks handling older collection documents
      const serialNumberRaw = (collection.serialNumber || '').trim();
      const customName = (
        collection.custom?.name ||
        collection.machineCustomName ||
        collection.machineName ||
        ''
      ).trim();
      const game = (collection.game || '').trim();

      const mainIdentifier =
        serialNumberRaw ||
        customName ||
        collection.machineId ||
        `Machine ${idx + 1}`;
      const bracketParts: string[] = [];

      // Only add customName if it's provided AND different from main identifier
      if (customName && customName !== mainIdentifier) {
        bracketParts.push(customName);
      }

      // Always include game - show "(game name not provided)" if blank
      if (game) {
        bracketParts.push(game);
      } else {
        bracketParts.push('(game name not provided)');
      }

      const machineDisplayName = `${mainIdentifier} (${bracketParts.join(', ')})`;

      // Use movement.drop/totalCancelledCredits if available (more reliable),
      // otherwise calculate from meter differences
      const drop =
        collection.movement?.drop ??
        (collection.metersIn || 0) - (collection.prevIn || 0);
      const cancelled =
        collection.movement?.totalCancelledCredits ??
        (collection.metersOut || 0) - (collection.prevOut || 0);
      const meterGross = collection.movement?.gross ?? 0;

      // 🚀 OPTIMIZED: Use pre-fetched meter data from batch query (no individual queries!)
      let sasGross = 0;
      let recalculatedJackpot = collection.sasMeters?.jackpot || 0;

      if (
        collection.machineId &&
        collection.sasMeters?.sasStartTime &&
        collection.sasMeters?.sasEndTime
      ) {
        const meterData = meterDataMap.get(collection.machineId);
        if (meterData) {
          sasGross = meterData.drop - meterData.cancelled;
          recalculatedJackpot = meterData.jackpot;
        }
      }

      const jackpot = recalculatedJackpot;
      const netGross = meterGross - jackpot;

      // Logic: includeJackpot = true means "Include Jackpot in Money Out" -> Lower Gross.
      // Since sasGross is (Drop - NetCancelled), which is the HIGH GROSS.
      // So if includeJackpot is TRUE, we want Low Gross, so we SUBTRACT jackpot.
      const adjustedSasGross = includeJackpot
        ? sasGross - (jackpot || 0)
        : sasGross;

      // Check if SAS data exists - if no SAS time window or no meter records found, show "No SAS Data"
      // Note: sasMeters.gross is NOT used as the gate (it can be 0 from a stale snapshot).
      // We rely on sasStartTime/sasEndTime presence AND whether the Meters DB query returned data.
      const hasNoSasData =
        !collection.sasMeters?.sasStartTime ||
        !collection.sasMeters?.sasEndTime ||
        !meterDataMap.has(String(collection.machineId));

      const hasRelay = hasRelayMap.get(String(collection.machineId)) ?? false;
      const isWow = isWowMap.get(String(collection.machineId)) ?? false;
      const hasIndividualSmib = hasRelay || isWow;

      // For variation calculation: treat noSMIBLocation machines as having SAS data
      // (variation = machineGross since SAS gross is 0).
      // For display: only show numeric values when machine has an actual SMIB.
      const hasSmibForVariation = hasIndividualSmib || isNoSMIBLocation;

      const variation = hasSmibForVariation
        ? meterGross - (hasNoSasData ? 0 : adjustedSasGross)
        : 0;

      const scaled = scaleMachineValues(
        {
          drop,
          cancelled,
          meterGross,
          jackpot,
          netGross,
          sasGross,
          variation,
          hasNoSasData,
        },
        moneyInScale,
        moneyOutScale
      );

      return {
        id: String(idx + 1),
        machineId: machineDisplayName,
        actualMachineId: collection.machineId,
        dropCancelled: `${formatSmartDecimal(scaled.drop)} / ${formatSmartDecimal(scaled.cancelled)}`,
        metersIn: Math.round((collection.metersIn ?? 0) * 100) / 100,
        metersOut: Math.round((collection.metersOut ?? 0) * 100) / 100,
        prevIn: Math.round((collection.prevIn ?? 0) * 100) / 100,
        prevOut: Math.round((collection.prevOut ?? 0) * 100) / 100,
        metersGross: scaled.meterGross,
        jackpot: scaled.jackpot,
        netGross: scaled.netGross,
        sasGross:
          !hasIndividualSmib
            ? 'No SMIB for this Machine'
            : hasNoSasData
              ? 'No SAS Data'
              : scaled.sasGross,
        variation:
          !hasIndividualSmib
            ? 'No SMIB for this Machine'
            : scaled.variation,
        sasStartTime: collection.sasMeters?.sasStartTime || null,
        sasEndTime: collection.sasMeters?.sasEndTime || null,
        hasIssue: false,
        ramClear: collection.ramClear || false,
        notes: (collection.notes as string | undefined) || undefined,
      };
    }),
    locationMetrics,
    sasMetrics,
  };
}
