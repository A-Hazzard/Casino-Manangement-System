/**
 * Admin Repair SAS Times Helpers
 *
 * This module provides functions for repairing SAS times in collections:
 * - Normalizing timestamps to 8AM Trinidad time (12:00 UTC)
 * - Finding previous collections for correct SAS time windows
 * - Calculating corrected SAS metrics
 * - Updating collections and machine timestamps
 *
 * @module app/api/lib/helpers/adminRepairSasTimes
 */

import { Collections } from '../models/collections';
import { Machine } from '../models/machines';
import { calculateSasMetrics } from './collectionCreation';

type RepairMode = 'dry-run' | 'commit';

type CollectionDocument = {
  _id: unknown;
  machineId: string;
  timestamp: Date;
  sasMeters?: {
    sasStartTime?: string;
    sasEndTime?: string;
  };
};

type RepairResult = {
  _id: string;
  machineId: string;
  oldStart?: string;
  oldEnd?: string;
  newStart: string;
  newEnd: string;
  changed: boolean;
};

/**
 * Normalize timestamp to 8AM Trinidad time (12:00 UTC)
 * Trinidad is UTC-4, so 8AM Trinidad = 12:00 UTC
 *
 * @param date - Date to normalize
 * @returns Normalized date at 8AM Trinidad time
 */
function normalizeTo8AMTrinidad(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(12, 0, 0, 0); // 12:00 UTC = 8:00 AM Trinidad
  return normalized;
}

/**
 * Repair SAS times for collections based on filters
 *
 * Flow:
 * 1. Build filter from query parameters
 * 2. Fetch collections matching filter, sorted chronologically
 * 3. For each collection:
 *    - Normalize timestamp to 8AM Trinidad
 *    - Find previous collection for correct SAS start time
 *    - Calculate corrected SAS metrics
 *    - Update collection and machine if in commit mode
 * 4. Return repair results
 *
 * @param filter - MongoDB filter for collections
 * @param mode - Repair mode: 'dry-run' or 'commit'
 * @returns Object containing repair results and summary
 */
export async function repairSasTimesForCollections(
  filter: Record<string, unknown>,
  mode: RepairMode
): Promise<{
  success: boolean;
  mode: RepairMode;
  count: number;
  changed: number;
  results: RepairResult[];
}> {
  // Fetch target collections and sort chronologically (oldest first)
  const collections = (await Collections.find(filter)
    .sort({ timestamp: 1 })
    .lean()) as CollectionDocument[];

  const results: RepairResult[] = [];

  for (const c of collections) {
    const repairResult = await repairSingleCollectionSasTimes(c, mode);
    results.push(repairResult);
  }

  return {
    success: true,
    mode,
    count: results.length,
    changed: results.filter(r => r.changed).length,
    results,
  };
}

/**
 * Repair SAS times for a single collection
 *
 * @param collection - Collection document to repair
 * @param mode - Repair mode: 'dry-run' or 'commit'
 * @returns Repair result for this collection
 */
async function repairSingleCollectionSasTimes(
  collection: CollectionDocument,
  mode: RepairMode
): Promise<RepairResult> {
  // Normalize current collection timestamp to 8AM Trinidad (12:00 UTC)
  const normalizedTimestamp = normalizeTo8AMTrinidad(
    new Date(collection.timestamp)
  );
  const currentEnd = normalizedTimestamp;

  // Find previous collection for this machine strictly before current timestamp
  const previous = (await Collections.findOne({
    machineId: collection.machineId,
    timestamp: { $lt: currentEnd },
  })
    .sort({ timestamp: -1 })
    .lean()) as CollectionDocument | null;

  // Previous collection also normalized to 8AM Trinidad
  let newStart = previous
    ? normalizeTo8AMTrinidad(new Date(previous.timestamp))
    : new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000);

  // Guard inversion
  if (newStart > currentEnd) {
    console.warn(`⚠️ Inversion detected for ${collection._id}, swapping times`);
    const tmp = newStart;
    newStart = new Date(currentEnd.getTime());
    currentEnd.setTime(tmp.getTime());
  }

  // Calculate SAS metrics for the corrected window
  const sas = await calculateSasMetrics(
    collection.machineId,
    newStart,
    currentEnd
  );

  const oldStart = collection.sasMeters?.sasStartTime;
  const oldEnd = collection.sasMeters?.sasEndTime;

  const changed =
    !oldStart ||
    !oldEnd ||
    oldStart !== sas.sasStartTime ||
    oldEnd !== sas.sasEndTime;

  const result: RepairResult = {
    _id: String(collection._id),
    machineId: String(collection.machineId),
    oldStart,
    oldEnd,
    newStart: sas.sasStartTime,
    newEnd: sas.sasEndTime,
    changed,
  };

  if (mode === 'commit' && changed) {
    await Collections.updateOne(
      { _id: collection._id },
      {
        $set: {
          timestamp: normalizedTimestamp, // Normalize collection timestamp to 8AM Trinidad
          'sasMeters.drop': sas.drop,
          'sasMeters.totalCancelledCredits': sas.totalCancelledCredits,
          'sasMeters.gross': sas.gross,
          'sasMeters.gamesPlayed': sas.gamesPlayed,
          'sasMeters.jackpot': sas.jackpot,
          'sasMeters.sasStartTime': sas.sasStartTime,
          'sasMeters.sasEndTime': sas.sasEndTime,
        },
      }
    );

    // Update machine.previousCollectionTime and collectionTime if this collection is newer
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const machine = await Machine.findOne({ _id: collection.machineId }).lean<{
      previousCollectionTime?: Date;
      collectionTime?: Date;
    }>();
    if (machine) {
      const prev = machine.previousCollectionTime
        ? new Date(machine.previousCollectionTime)
        : undefined;
      if (!prev || prev < normalizedTimestamp) {
        await Machine.updateOne(
          { _id: collection.machineId },
          {
            $set: {
              previousCollectionTime: normalizedTimestamp,
              collectionTime: normalizedTimestamp,
            },
          }
        );
      }
    }
  }

  return result;
}


