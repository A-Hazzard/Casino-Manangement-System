import mongoose from 'mongoose';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';


type CollectionSnapshot = {
  _id: mongoose.Types.ObjectId | string;
  metersIn?: number;
  metersOut?: number;
  prevIn?: number;
  prevOut?: number;
  collectionTime?: Date;
  timestamp?: Date;
  softMetersIn?: number;
  softMetersOut?: number;
  ramClear?: boolean;
  ramClearCoinIn?: number;
  ramClearCoinOut?: number;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  locationReportId?: string;
};

function getCollectionSortTime(collection: CollectionSnapshot): number {
  const raw =
    collection.collectionTime ??
    collection.timestamp ??
    new Date(0);
  return new Date(raw).getTime();
}

function getObjectIdTime(collection: CollectionSnapshot): number {
  if (
    typeof collection._id === 'object' &&
    collection._id !== null &&
    'getTimestamp' in collection._id
  ) {
    return (collection._id as mongoose.Types.ObjectId)
      .getTimestamp()
      .getTime();
  }
  return 0;
}

/**
 * Retrieves all collections of a machine in chronological order and updates machine collectionMetersHistory.
 * No longer cascades/recalculates subsequent collections' meters — it only updates the Machine doc.
 *
 * @param machineId - The machine to update history for.
 * @param anchorCollectionId - Unused (kept for compatibility with callers).
 */
export async function recalculateMachineCollections(
  machineId?: string | null
) {
  if (!machineId) {
    return;
  }

  const collections = await Collections.find({
    machineId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  }).lean<CollectionSnapshot[]>();

  if (!collections.length) {
    return;
  }

  const sorted = [...collections].sort((a, b) => {
    const timeDiff = getCollectionSortTime(a) - getCollectionSortTime(b);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return getObjectIdTime(a) - getObjectIdTime(b);
  });

  const historyEntries: Array<{
    _id: mongoose.Types.ObjectId;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    timestamp: Date;
    locationReportId: string;
  }> = [];

  for (let collectionIndex = 0; collectionIndex < sorted.length; collectionIndex++) {
    const col = sorted[collectionIndex];
    historyEntries.push({
      _id: new mongoose.Types.ObjectId(),
      metersIn: Number(col.metersIn ?? 0),
      metersOut: Number(col.metersOut ?? 0),
      prevMetersIn: Number(col.prevIn ?? 0),
      prevMetersOut: Number(col.prevOut ?? 0),
      timestamp:
        (col.collectionTime as Date | undefined) ??
        (col.timestamp as Date | undefined) ??
        new Date(),
      locationReportId: col.locationReportId ?? '',
    });
  }

  const lastCol = sorted[sorted.length - 1];
  const finalMetersIn = lastCol ? Number(lastCol.metersIn ?? 0) : 0;
  const finalMetersOut = lastCol ? Number(lastCol.metersOut ?? 0) : 0;

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $set: {
        'collectionMeters.metersIn': finalMetersIn,
        'collectionMeters.metersOut': finalMetersOut,
        collectionMetersHistory: historyEntries,
        updatedAt: new Date(),
      },
    },
    { new: true }
  );
}

