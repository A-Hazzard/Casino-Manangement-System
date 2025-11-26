import mongoose from 'mongoose';
import { Collections } from '../models/collections';
import { Machine } from '../models/machines';
import { calculateMovement } from '@/lib/utils/movementCalculation';

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

export async function recalculateMachineCollections(machineId?: string | null) {
  if (!machineId) {
    return;
  }

  const collections = (await Collections.find({
    machineId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  }).lean()) as CollectionSnapshot[];

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

  let prevMetersIn = 0;
  let prevMetersOut = 0;
  const historyEntries: Array<{
    _id: mongoose.Types.ObjectId;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    timestamp: Date;
    locationReportId: string;
  }> = [];

  for (const col of sorted) {
    const currentIn = Number(col.metersIn ?? 0);
    const currentOut = Number(col.metersOut ?? 0);
    const movement = calculateMovement(
      currentIn,
      currentOut,
      { metersIn: prevMetersIn, metersOut: prevMetersOut },
      col.ramClear,
      col.ramClearCoinIn as number | undefined,
      col.ramClearCoinOut as number | undefined,
      col.ramClearMetersIn as number | undefined,
      col.ramClearMetersOut as number | undefined
    );

    const roundedMovement = {
      metersIn: Number(movement.metersIn.toFixed(2)),
      metersOut: Number(movement.metersOut.toFixed(2)),
      gross: Number(movement.gross.toFixed(2)),
    };

    const softMetersIn =
      col.ramClear && col.ramClearMetersIn !== undefined
        ? Number(col.ramClearMetersIn)
        : currentIn;
    const softMetersOut =
      col.ramClear && col.ramClearMetersOut !== undefined
        ? Number(col.ramClearMetersOut)
        : currentOut;

    await Collections.updateOne(
      { _id: col._id },
      {
        $set: {
          prevIn: prevMetersIn,
          prevOut: prevMetersOut,
          movement: roundedMovement,
          softMetersIn,
          softMetersOut,
          updatedAt: new Date(),
        },
      }
    );

    historyEntries.push({
      _id: new mongoose.Types.ObjectId(),
      metersIn: currentIn,
      metersOut: currentOut,
      prevMetersIn: prevMetersIn,
      prevMetersOut: prevMetersOut,
      timestamp:
        (col.collectionTime as Date | undefined) ??
        (col.timestamp as Date | undefined) ??
        new Date(),
      locationReportId: col.locationReportId ?? '',
    });

    prevMetersIn = currentIn;
    prevMetersOut = currentOut;
  }

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Machine.findOneAndUpdate(
    { _id: machineId },
    {
      $set: {
        'collectionMeters.metersIn': prevMetersIn,
        'collectionMeters.metersOut': prevMetersOut,
        collectionMetersHistory: historyEntries,
        updatedAt: new Date(),
      },
    },
    { new: true }
  );
}


