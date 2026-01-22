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
 * @param payload - The raw payload from the frontend.
 * @returns An object with calculated totals.
 */
export async function calculateCollectionReportTotals(
  payload: CreateCollectionReportPayload & {
    machines?: CollectionReportMachineEntry[];
    collectionIds?: string[]; // Optional: collection _id array to avoid queries
  }
) {
  console.log(
    '🔄 [Calculations] Starting collection report totals calculation...'
  );
  const machines: CollectionReportMachineEntry[] = payload.machines || [];
  const collectionIds = payload.collectionIds || [];
  let totalDrop = 0;
  let totalCancelled = 0;
  let totalSasGross = 0;

  console.log(`🔄 [Calculations] Processing ${machines.length} machines...`, {
    hasCollectionIds: collectionIds.length > 0,
    collectionIdsCount: collectionIds.length,
  });

  // Helper function to query collection by machineId and meters (fallback method)
  const queryCollectionByMachine = async (
    m: CollectionReportMachineEntry,
    reportTimestamp: Date
  ) => {
    const minTimestamp = new Date(
      reportTimestamp.getTime() - 24 * 60 * 60 * 1000
    );
    const collectionQuery = {
      machineId: m.machineId,
      metersIn: Number(m.metersIn),
      metersOut: Number(m.metersOut),
      timestamp: { $gte: minTimestamp },
      $or: [{ locationReportId: '' }, { locationReportId: { $exists: false } }],
    };

    return (await Collections.findOne(collectionQuery)
      .sort({ timestamp: -1 })
      .maxTimeMS(10000) // 10 second timeout per query
      .lean()) as CollectionDocument | null;
  };

  // Get report timestamp to filter recent collections only
  const reportTimestamp = payload.timestamp
    ? new Date(payload.timestamp)
    : new Date();

  // If we have collection IDs, use them directly (much faster)
  if (collectionIds.length > 0 && collectionIds.length === machines.length) {
    console.log('🔄 [Calculations] Using collection IDs for direct lookup...');
    for (let i = 0; i < machines.length; i++) {
      const m = machines[i];
      const collectionId = collectionIds[i];

      if (!m.machineId) continue;

      let collection: CollectionDocument | null = null;

      // Try direct lookup by collection ID first
      if (collectionId) {
        try {
          console.log(
            `🔍 [Calculations] Looking up collection ${collectionId} for machine ${m.machineId}...`
          );

          collection = (await Collections.findOne({ _id: collectionId })
            .maxTimeMS(10000) // 10 second timeout
            .lean()) as CollectionDocument | null;

          if (collection) {
            console.log(
              `✅ [Calculations] Found collection ${collectionId} via direct lookup`
            );
          } else {
            console.warn(
              `⚠️ [Calculations] Collection ${collectionId} not found. Trying query method...`
            );
          }
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
          console.log(
            `🔍 [Calculations] Querying collection for machine ${m.machineId} with meters ${m.metersIn}/${m.metersOut}...`
          );
          collection = await queryCollectionByMachine(m, reportTimestamp);
          if (collection) {
            console.log(
              `✅ [Calculations] Found collection for machine ${m.machineId} via query method`
            );
          }
        } catch (err) {
          console.error(
            `❌ [Calculations] Error querying collection for machine ${m.machineId}:`,
            err
          );
        }
      }

      // Process the collection if found
      if (collection) {
        const moveIn = collection.movement?.metersIn || 0;
        const moveOut = collection.movement?.metersOut || 0;

        totalDrop += moveIn;
        totalCancelled += moveOut;

        const sasGross = collection.sasMeters?.gross || 0;
        totalSasGross += sasGross;
      } else {
        console.warn(
          `⚠️ [Calculations] Collection document not found for machine ${m.machineId} with meters ${m.metersIn}/${m.metersOut}. Skipping totals for this machine.`
        );
      }
    }
  } else {
    // Fallback: Query by machineId and meters (original method)
    console.log(
      '🔄 [Calculations] Using query method (no collection IDs provided)...'
    );

    for (const m of machines) {
      if (!m.machineId) continue;

      try {
        const collection = await queryCollectionByMachine(m, reportTimestamp);

        if (collection) {
          const moveIn = collection.movement?.metersIn || 0;
          const moveOut = collection.movement?.metersOut || 0;

          totalDrop += moveIn;
          totalCancelled += moveOut;

          const sasGross = collection.sasMeters?.gross || 0;
          totalSasGross += sasGross;

          console.log(
            `✅ [Calculations] Found collection for machine ${m.machineId}:`,
            {
              collectionId: collection._id,
              moveIn,
              moveOut,
              sasGross,
            }
          );
        } else {
          console.warn(
            `⚠️ [Calculations] Collection document not found for machine ${m.machineId} with meters ${m.metersIn}/${m.metersOut}. Skipping totals for this machine.`
          );
        }
      } catch (err) {
        console.error(
          `❌ [Calculations] Error processing machine ${m.machineId}:`,
          err
        );
        // Continue processing other machines even if one fails
      }
    }
  }

  const totalGross = totalDrop - totalCancelled;

  console.log('✅ [Calculations] Totals calculated:', {
    totalDrop,
    totalCancelled,
    totalGross,
    totalSasGross,
  });

  return {
    totalDrop,
    totalCancelled,
    totalGross,
    totalSasGross,
  };
}

