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
import { Meters } from '@/app/api/lib/models/meters';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import type {
  CollectionDocument,
  CollectionReportMachineEntry,
} from '@/lib/types/collection';

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

  // If we have collection IDs, use them directly (much faster)
  if (collectionIds.length > 0 && collectionIds.length === machines.length) {
    console.log('🔄 [Calculations] Using collection IDs for direct lookup...');
    for (let machineIndex = 0; machineIndex < machines.length; machineIndex++) {
      const machine = machines[machineIndex];
      const collectionId = collectionIds[machineIndex];

      if (!machine.machineId) continue;

      let collection: CollectionDocument | null = null;

      // Try direct lookup by collection ID first
      if (collectionId) {
        try {
          collection = await Collections.findOne({ _id: collectionId })
            .maxTimeMS(10000)
            .lean<CollectionDocument>();
        } catch (err) {
          console.error(
            `❌ [Calculations] Error looking up collection ${collectionId}:`,
            err
          );
        }
      }

      // If direct lookup failed, try query method as fallback
      if (!collection) {
        try {
          collection = await queryCollectionByMachine(machine, reportTimestamp);
        } catch (err) {
          console.error(
            `❌ [Calculations] Error querying collection for machine ${machine.machineId}:`,
            err
          );
        }
      }

      // Process the collection if found
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
  } else {
    // Fallback: Query by machineId and meters (original method)
    for (const machine of machines) {
      if (!machine.machineId) continue;

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
          `❌ [Calculations] Error processing machine ${machine.machineId}:`,
          err
        );
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
 */
export async function computeTotalVariation(
  locationReportId: string,
  locationId?: string
): Promise<number> {
  const collections = await Collections.find(
    { locationReportId },
    { movement: 1, sasMeters: 1, machineId: 1 }
  ).lean<Pick<CollectionDocument, 'movement' | 'sasMeters' | 'machineId'>[]>();

  if (!collections.length) return 0;

  // Fetch relayId per machine for SMIB filtering
  const machineIds = collections
    .map(c => c.machineId)
    .filter((id): id is string => Boolean(id));

  let smibMap = new Map<string, boolean>();
  if (machineIds.length) {
    const machines = await Machine.find(
      { _id: { $in: machineIds } },
      { relayId: 1 }
    ).lean<{ _id: string; relayId?: string }[]>();
    smibMap = new Map(
      machines.map(m => [String(m._id), Boolean(m.relayId?.trim())])
    );
  }

  // Check includeJackpot from licencee
  let includeJackpot = false;
  if (locationId) {
    const location = await GamingLocations.findOne(
      { _id: locationId },
      { 'rel.licencee': 1 }
    ).lean<{ rel?: { licencee?: string } } | null>();
    if (location?.rel?.licencee) {
      const { Licencee } = await import('@/app/api/lib/models/licencee');
      const licencee = await Licencee.findOne(
        { _id: location.rel.licencee },
        { includeJackpot: 1 }
      ).lean<{ includeJackpot?: boolean } | null>();
      includeJackpot = Boolean(licencee?.includeJackpot);
    }
  }

  // Batched SAS meter data query — same pattern as accountingDetails.ts
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

  const meterDataMap = new Map<
    string,
    { drop: number; cancelled: number; jackpot: number }
  >();
  if (meterQueries.length > 0) {
    const cursor = Meters.aggregate([
      {
        $match: {
          $or: meterQueries.map(q => ({
            machine: q.machineId,
            readAt: { $gte: q.startTime, $lte: q.endTime },
          })),
        },
      },
      {
        $group: {
          _id: '$machine',
          totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
          totalCancelled: {
            $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
          },
          totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
        },
      },
    ]).cursor({ batchSize: 1000 });

    for await (const doc of cursor) {
      meterDataMap.set(doc._id, {
        drop: doc.totalDrop,
        cancelled: doc.totalCancelled,
        jackpot: doc.totalJackpot,
      });
    }
  }

  // Sum per-machine variation — identical formula to accountingDetails.ts
  return collections.reduce((sum, col) => {
    const hasSmib = smibMap.get(String(col.machineId)) ?? false;
    if (!hasSmib) return sum;

    const meterGross = col.movement?.gross ?? 0;

    // Recalculate SAS gross from batched meter data (same as accountingDetails.ts)
    let sasGross = 0;
    let machineJackpot = 0;
    if (
      col.machineId &&
      col.sasMeters?.sasStartTime &&
      col.sasMeters?.sasEndTime
    ) {
      const meterData = meterDataMap.get(col.machineId);
      if (meterData) {
        sasGross = meterData.drop - meterData.cancelled;
        machineJackpot = meterData.jackpot;
      }
    }

    const adjustedSasGross = includeJackpot
      ? sasGross - machineJackpot
      : sasGross;

    const hasNoSasData =
      !col.sasMeters?.sasStartTime ||
      !col.sasMeters?.sasEndTime ||
      !meterDataMap.has(String(col.machineId));

    return sum + (meterGross - (hasNoSasData ? 0 : adjustedSasGross));
  }, 0);
}
