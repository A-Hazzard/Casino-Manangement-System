/**
 * Collection Report Calculations Helper Functions
 *
 * Provides backend helper functions for calculating financial totals for collection reports,
 * including drop, cancelled credits, gross, and SAS gross metrics. It aggregates
 * values from machine collections and meters data to provide comprehensive report totals.
 *
 * Features:
 * - Calculates total drop and cancelled credits from machine collections.
 * - Calculates total gross (drop - cancelled credits).
 * - Calculates total SAS gross from meters collection movement data.
 */

import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import type {
  CollectionDocument,
  CollectionReportMachineEntry,
} from '@/lib/types/collection';
import { isWowMachine } from '@/shared/utils/wowMachine';
import { aggregateMeterDataForWindows } from './variation';

// ============================================================================
// Collection Report Total Calculations
// ============================================================================

/**
 * Calculates totalDrop, totalCancelled, totalGross, and totalSasGross for a collection report.
 * Optimization: Uses existing Collections documents instead of querying raw Meters.
 * @param {CreateCollectionReportPayload & { machines?: CollectionReportMachineEntry[]; collectionIds?: string[] }} payload - The raw payload from the frontend.
 * @returns {Promise<{ totalDrop: number; totalCancelled: number; totalGross: number; totalSasGross: number; totalJackpot: number }>} An object with calculated totals.
 */
export async function calculateCollectionReportTotals(
  payload: CreateCollectionReportPayload & {
    machines?: CollectionReportMachineEntry[];
    collectionIds?: string[]; // Optional: collection _id array to avoid queries
  }
) {
  if (!payload || typeof payload !== 'object') {
    console.error('[calculateCollectionReportTotals] payload is required');
    return {
      totalDrop: 0,
      totalCancelled: 0,
      totalGross: 0,
      totalSasGross: 0,
      totalJackpot: 0,
    };
  }
  console.log(
    '🔄 [Calculations] Starting collection report totals calculation...'
  );
  const machines: CollectionReportMachineEntry[] = payload.machines || [];
  const collectionIds = payload.collectionIds || [];
  let totalDrop = 0;
  let totalCancelled = 0;
  let totalSasGross = 0;
  let totalJackpot = 0;

  console.log(
    '🔄 [Calculations] Processing ' +
      machines.length +
      (machines.length === 1 ? ' machine' : ' machines'),
    {
      hasCollectionIds: collectionIds.length > 0,
      collectionIdsCount: collectionIds.length,
      includeJackpot: payload.includeJackpot,
    }
  );

  // Helper function to query collection by machineId and meters (fallback method)
  const queryCollectionByMachine = async (
    machineEntry: CollectionReportMachineEntry,
    reportTimestamp: Date
  ) => {
    const minTimestamp = new Date(
      reportTimestamp.getTime() - 24 * 60 * 60 * 1000
    );
    const collectionQuery = {
      machineId: machineEntry.machineId,
      metersIn: Number(machineEntry.metersIn),
      metersOut: Number(machineEntry.metersOut),
      timestamp: { $gte: minTimestamp },
      $or: [{ locationReportId: '' }, { locationReportId: { $exists: false } }],
    };

    return Collections.findOne(collectionQuery)
      .sort({ timestamp: -1 })
      .maxTimeMS(10000) // 10 second timeout per query
      .lean<CollectionDocument>();
  };

  // Get report timestamp to filter recent collections only
  const reportTimestamp = payload.timestamp
    ? new Date(payload.timestamp)
    : new Date();

  // Batch-fetch collections in a single query when IDs are available (N+1 → 1)
  if (collectionIds.length > 0 && collectionIds.length === machines.length) {
    console.log('🔄 [Calculations] Batch-fetching collections by ID...');
    const validCollectionIds = collectionIds.filter(Boolean);
    const batchStart = Date.now();

    let fetchedCollections: CollectionDocument[] = [];
    if (validCollectionIds.length > 0) {
      fetchedCollections = await Collections.find({
        _id: { $in: validCollectionIds },
      })
        .maxTimeMS(15000)
        .lean<CollectionDocument[]>();
    }

    const collectionByIdMap = new Map(
      fetchedCollections.map(col => [String(col._id), col])
    );
    console.log(
      `✅ [Calculations] Batch-fetched ${fetchedCollections.length}/${validCollectionIds.length} collections in ${Date.now() - batchStart}ms`
    );

    // Track which IDs weren't found so we can fallback
    const missingIndices: number[] = [];

    for (let machineIndex = 0; machineIndex < machines.length; machineIndex++) {
      const machine = machines[machineIndex];
      const collectionId = collectionIds[machineIndex];

      if (!machine.machineId) continue;

      let collection: CollectionDocument | null = null;

      if (collectionId) {
        collection = collectionByIdMap.get(String(collectionId)) ?? null;
      }

      if (collection) {
        const moveIn = collection.movement?.metersIn || 0;
        const moveOut = collection.movement?.metersOut || 0;
        const jackpot = collection.sasMeters?.jackpot || 0;

        totalDrop += moveIn;
        totalCancelled += moveOut;
        totalJackpot += jackpot;

        const sasGross = collection.sasMeters?.gross || 0;
        totalSasGross += sasGross;
      } else {
        missingIndices.push(machineIndex);
      }
    }

    // Fallback: query individually for any collections not found by batch
    if (missingIndices.length > 0) {
      console.log(
        `🔄 [Calculations] Falling back to individual lookup for ${missingIndices.length} missing collections...`
      );
      for (const machineIndex of missingIndices) {
        const machine = machines[machineIndex];
        try {
          const collection = await queryCollectionByMachine(
            machine,
            reportTimestamp
          );
          if (collection) {
            const moveIn = collection.movement?.metersIn || 0;
            const moveOut = collection.movement?.metersOut || 0;
            const jackpot = collection.sasMeters?.jackpot || 0;

            totalDrop += moveIn;
            totalCancelled += moveOut;
            totalJackpot += jackpot;

            const sasGross = collection.sasMeters?.gross || 0;
            totalSasGross += sasGross;
          }
        } catch (err) {
          console.error(
            `❌ [Calculations] Error querying collection for machine ${machine.machineId}:`,
            err
          );
        }
      }
    }
  } else {
    // Fallback: Batch-fetch by machineId + meters when no collection IDs
    console.log('🔄 [Calculations] Batch-fetching collections by machine query...');
    const batchStart = Date.now();
    const minTimestamp = new Date(
      reportTimestamp.getTime() - 24 * 60 * 60 * 1000
    );

    const batchQuery = machines
      .filter(m => m.machineId)
      .map(m => ({
        machineId: m.machineId,
        metersIn: Number(m.metersIn),
        metersOut: Number(m.metersOut),
      }));

    if (batchQuery.length > 0) {
      const fetchedCollections = await Collections.find({
        $or: batchQuery.map(q => ({
          machineId: q.machineId,
          metersIn: q.metersIn,
          metersOut: q.metersOut,
          timestamp: { $gte: minTimestamp },
          $or: [
            { locationReportId: '' },
            { locationReportId: { $exists: false } },
          ],
        })),
      })
        .sort({ timestamp: -1 })
        .maxTimeMS(15000)
        .lean<CollectionDocument[]>();

      console.log(
        `✅ [Calculations] Batch-fetched ${fetchedCollections.length} collections in ${Date.now() - batchStart}ms`
      );

      // Build a map keyed by machineId+metersIn+metersOut for dedup
      const batchKeyMap = new Map<string, CollectionDocument>();
      for (const col of fetchedCollections) {
        const key = `${String(col.machineId)}:${col.metersIn}:${col.metersOut}`;
        if (!batchKeyMap.has(key)) {
          batchKeyMap.set(key, col);
        }
      }

      for (const machine of machines) {
        if (!machine.machineId) continue;
        const key = `${machine.machineId}:${Number(machine.metersIn)}:${Number(machine.metersOut)}`;
        const collection = batchKeyMap.get(key);

        if (collection) {
          const moveIn = collection.movement?.metersIn || 0;
          const moveOut = collection.movement?.metersOut || 0;
          const jackpot = collection.sasMeters?.jackpot || 0;

          totalDrop += moveIn;
          totalCancelled += moveOut;
          totalJackpot += jackpot;

          const sasGross = collection.sasMeters?.gross || 0;
          totalSasGross += sasGross;
        }
      }
    }
  }

  // Apply includeJackpot logic
  // If enabled, totalCancelled is adjusted (Money Out = Cancelled Credits + Jackpots)
  const useIncludeJackpot = !!payload.includeJackpot;
  const effectiveTotalCancelled = useIncludeJackpot
    ? totalCancelled + totalJackpot
    : totalCancelled;

  const totalGross = totalDrop - effectiveTotalCancelled;
  const effectiveTotalSasGross = useIncludeJackpot
    ? Math.max(0, totalSasGross - totalJackpot)
    : totalSasGross;

  console.log('✅ [Calculations] Totals calculated:', {
    totalDrop,
    totalCancelled,
    totalJackpot,
    useIncludeJackpot,
    effectiveTotalCancelled,
    totalGross,
    totalSasGross,
    effectiveTotalSasGross,
  });

  return {
    totalDrop,
    totalCancelled: effectiveTotalCancelled,
    totalGross,
    totalSasGross: effectiveTotalSasGross,
    totalJackpot, // Include raw jackpot total for reference
  };
}

// ============================================================================
// Total Variation Calculation
// ============================================================================

/**
 * Computes total variation from stored collections (movement.gross - adjustedSasGross)
 * for a given collection report, respecting hasSmib filtering and includeJackpot.
 *
 * @param locationReportId - The report's unique identifier
 * @param locationId - Optional location ID for licencee lookup
 * @param includeJackpotOverride - Optional pre-resolved includeJackpot value to skip DB lookup
 */
export async function computeTotalVariation(
  locationReportId: string,
  locationId?: string,
  includeJackpotOverride?: boolean
): Promise<number> {
  const collections = await Collections.find(
    { locationReportId },
    {
      movement: 1,
      sasMeters: 1,
      machineId: 1,
      meterId: 1,
      metersIn: 1,
      metersOut: 1,
      prevIn: 1,
      prevOut: 1,
    }
  ).lean<
    Pick<
      CollectionDocument,
      | 'movement'
      | 'sasMeters'
      | 'machineId'
      | 'meterId'
      | 'metersIn'
      | 'metersOut'
      | 'prevIn'
      | 'prevOut'
    >[]
  >();

  if (!collections.length) return 0;

  // Fetch relayId per machine for SMIB filtering
  const machineIds = collections
    .map(c => c.machineId)
    .filter((id): id is string => Boolean(id));

  // Determine if location is no-SMIB (all machines are WOW-synced)
  let isNoSMIBLocation = false;

  // Parallelize: machine lookup + optional licencee lookup
  let smibMap = new Map<string, boolean>();
  let wowMap = new Map<string, boolean>();
  let includeJackpot = includeJackpotOverride ?? false;

  const parallelPromises: Promise<void>[] = [];

  if (machineIds.length) {
    parallelPromises.push(
      (async () => {
        const machines = await Machine.find(
          { _id: { $in: machineIds } },
          { relayId: 1, 'meta.dataSync.source': 1 }
        ).lean<
          Array<{
            _id: string;
            relayId?: string;
            meta?: { dataSync?: { source?: string } };
          }>
        >();
        smibMap = new Map(
          machines.map(m => [String(m._id), Boolean(m.relayId?.trim())])
        );
        wowMap = new Map(
          machines.map(m => [String(m._id), isWowMachine(m)])
        );
      })()
    );
  }

  // Fetch location details (noSMIBLocation + licencee for includeJackpot)
  if (locationId) {
    parallelPromises.push(
      (async () => {
        const location = await GamingLocations.findOne(
          { _id: locationId },
          { 'rel.licencee': 1, noSMIBLocation: 1 }
        ).lean<{ rel?: { licencee?: string }; noSMIBLocation?: boolean } | null>();
        if (location) {
          isNoSMIBLocation = location.noSMIBLocation === true;

          if (includeJackpotOverride === undefined && location.rel?.licencee) {
            const { Licencee } = await import('@/app/api/lib/models/licencee');
            const licencee = await Licencee.findOne(
              { _id: location.rel.licencee },
              { includeJackpot: 1 }
            ).lean<{ includeJackpot?: boolean } | null>();
            includeJackpot = Boolean(licencee?.includeJackpot);
          }
        }
      })()
    );
  }

  if (parallelPromises.length > 0) {
    await Promise.all(parallelPromises);
  }

  // Helper: a machine has SMIB capability if it has a relay, is a WOW machine,
  // or is at a no-SMIB location (where WOW sync provides the meter data).
  const machineHasSmib = (machineId: string): boolean =>
    (smibMap.get(machineId) ?? false) ||
    (wowMap.get(machineId) ?? false) ||
    isNoSMIBLocation;

  // Use the SAME windowed aggregation the detail page and variation checker use.
  // This guarantees the stored totalVariation matches the displayed value.
  // Only SMIB/WOW/no-SMIB-location machines can have SAS variation.
  const meterQueries = collections
    .filter(col => {
      const machineId = String(col.machineId);
      return (
        machineHasSmib(machineId) &&
        col.sasMeters?.sasStartTime &&
        col.sasMeters?.sasEndTime
      );
    })
    .map(col => ({
      machineId: String(col.machineId),
      startTime: new Date(col.sasMeters!.sasStartTime!),
      endTime: new Date(col.sasMeters!.sasEndTime!),
    }));

  const meterDataMap = await aggregateMeterDataForWindows(meterQueries);

  const totalVariation = collections.reduce((sum, col) => {
    const machineId = String(col.machineId);

    if (!machineHasSmib(machineId)) return sum;

    const meterGross = col.movement?.gross ?? 0;

    let sasGross = 0;
    let sasJackpot = col.sasMeters?.jackpot ?? 0;
    let hasLiveData = false;

    if (col.sasMeters?.sasStartTime && col.sasMeters?.sasEndTime) {
      const liveData = meterDataMap.get(machineId);
      if (liveData) {
        sasGross = liveData.drop - liveData.cancelled;
        sasJackpot = liveData.jackpot;
        hasLiveData = true;
      }
    }

    // When no live SAS data is found, fall back to sasGross = 0 — matching the
    // detail page's hasNoSasData logic (variation = meterGross).
    const effectiveSasGross = hasLiveData ? sasGross : 0;

    const adjustedSasGross = includeJackpot
      ? effectiveSasGross - sasJackpot
      : effectiveSasGross;

    return sum + (meterGross - adjustedSasGross);
  }, 0);

  console.log(
    `[computeTotalVariation] report=${locationReportId} machines=${collections.length} includeJackpot=${includeJackpot} totalVariation=${totalVariation}`
  );

  return totalVariation;
}

