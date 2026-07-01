/**
 * Transfer Meters Operations
 *
 * Backfills meter.location to match machine.gamingLocation when a cabinet
 * has been moved but historical meter documents still reference the old location.
 *
 * @module app/api/lib/helpers/cabinets/transferMetersOperations
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { getClientIP } from '@/lib/utils/ipAddress';
import type {
  TransferMetersBatchResult,
  TransferMetersStats,
} from '@shared/types/meters';
import type { NextRequest } from 'next/server';
import os from 'os';

const DEFAULT_BATCH_SIZE = 2000;
const MIN_CONCURRENCY = 2;
const MAX_CONCURRENCY = 16;
const MAX_CHUNK_BATCH_SIZE = 5000;

export function getDefaultTransferMetersConcurrency(): number {
  const cpuCount = os.cpus().length;
  return Math.min(Math.max(cpuCount, MIN_CONCURRENCY), MAX_CONCURRENCY);
}

export function getDefaultTransferMetersBatchSize(): number {
  return DEFAULT_BATCH_SIZE;
}

function resolveConcurrency(concurrency?: number): number {
  return Math.min(
    Math.max(concurrency ?? getDefaultTransferMetersConcurrency(), MIN_CONCURRENCY),
    MAX_CONCURRENCY
  );
}

function resolveChunkBatchSize(batchSize?: number): number {
  return Math.min(
    Math.max(batchSize ?? DEFAULT_BATCH_SIZE, 1),
    MAX_CHUNK_BATCH_SIZE
  );
}

function splitIntoChunks<T>(items: T[], chunkCount: number): T[][] {
  if (items.length === 0) {
    return [];
  }

  const effectiveChunkCount = Math.min(chunkCount, items.length);
  const chunkSize = Math.ceil(items.length / effectiveChunkCount);
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

type MeterCountAggregateRow = {
  total: number;
  transferred: number;
  pending: number;
  eligible: number;
};

type TransferMetersContext = {
  cabinetId: string;
  gamingLocation: string;
  locationName: string;
  gameDayOffset: number;
  defaultFromDateTime: string;
  defaultToDateTime: string;
};

type OperationError = {
  success: false;
  error: string;
  status: number;
};

type DateRange = {
  fromDateTime: Date;
  toDateTime: Date;
};

function isOperationError(
  value: TransferMetersContext | OperationError
): value is OperationError {
  return 'success' in value && value.success === false;
}

function parseDateRange(
  fromDateTimeParam?: string,
  toDateTimeParam?: string,
  defaults?: { from: string; to: string }
): DateRange | OperationError {
  const fromDateTime = new Date(
    fromDateTimeParam ?? defaults?.from ?? new Date().toISOString()
  );
  const toDateTime = new Date(
    toDateTimeParam ?? defaults?.to ?? new Date().toISOString()
  );

  if (
    Number.isNaN(fromDateTime.getTime()) ||
    Number.isNaN(toDateTime.getTime())
  ) {
    return { success: false, error: 'Invalid date range', status: 400 };
  }

  if (fromDateTime.getTime() > toDateTime.getTime()) {
    return {
      success: false,
      error: 'fromDateTime must be before or equal to toDateTime',
      status: 400,
    };
  }

  return { fromDateTime, toDateTime };
}

function isDateRangeError(
  value: DateRange | OperationError
): value is OperationError {
  return 'success' in value;
}

function buildReadAtFilter(fromDateTime: Date, toDateTime: Date) {
  return { $gte: fromDateTime, $lte: toDateTime };
}

export function hasTransferMetersAdminAccess(
  userRoles: string[] | undefined
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some(role =>
    ['developer', 'owner', 'admin'].includes(role)
  );
}

async function loadTransferMetersContext(
  cabinetId: string
): Promise<TransferMetersContext | OperationError> {
  const machine = await Machine.findOne({ _id: cabinetId }).lean<{
    _id: string;
    gamingLocation?: string;
    serialNumber?: string;
  }>();

  if (!machine) {
    return { success: false, error: 'Cabinet not found', status: 404 };
  }

  const gamingLocation = machine.gamingLocation?.trim() ?? '';
  if (!gamingLocation) {
    return {
      success: false,
      error: 'Cabinet has no gaming location assigned',
      status: 400,
    };
  }

  const locationDoc = await GamingLocations.findOne({
    _id: gamingLocation,
  }).lean<{ _id: string; name?: string; gameDayOffset?: number }>();

  const nowIso = new Date().toISOString();

  return {
    cabinetId,
    gamingLocation,
    locationName: locationDoc?.name ?? gamingLocation,
    gameDayOffset: locationDoc?.gameDayOffset ?? 8,
    defaultFromDateTime: nowIso,
    defaultToDateTime: nowIso,
  };
}

async function aggregateMeterCounts(
  cabinetId: string,
  gamingLocation: string,
  fromDateTime: Date,
  toDateTime: Date
): Promise<MeterCountAggregateRow> {
  const eligibleMatch: Record<string, unknown> = {
    $and: [
      { $ne: ['$location', gamingLocation] },
      { $gte: ['$readAt', fromDateTime] },
      { $lte: ['$readAt', toDateTime] },
    ],
  };

  const pipeline = [
    { $match: { machine: cabinetId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        transferred: {
          $sum: {
            $cond: [{ $eq: ['$location', gamingLocation] }, 1, 0],
          },
        },
        pending: {
          $sum: {
            $cond: [{ $ne: ['$location', gamingLocation] }, 1, 0],
          },
        },
        eligible: {
          $sum: {
            $cond: [eligibleMatch, 1, 0],
          },
        },
      },
    },
  ];

  const results = await Meters.aggregate<MeterCountAggregateRow>(
    pipeline
  ).exec();

  const row = results[0];
  return {
    total: row?.total ?? 0,
    transferred: row?.transferred ?? 0,
    pending: row?.pending ?? 0,
    eligible: row?.eligible ?? 0,
  };
}

function buildMismatchFilter(
  cabinetId: string,
  gamingLocation: string,
  fromDateTime: Date,
  toDateTime: Date,
  cursor?: string
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    machine: cabinetId,
    location: { $ne: gamingLocation },
    readAt: buildReadAtFilter(fromDateTime, toDateTime),
  };

  if (cursor) {
    filter._id = { $gt: cursor };
  }

  return filter;
}

export async function getTransferMetersStats(
  cabinetId: string,
  fromDateTimeParam?: string,
  toDateTimeParam?: string
): Promise<TransferMetersStats | OperationError> {
  const context = await loadTransferMetersContext(cabinetId);
  if (isOperationError(context)) {
    return context;
  }

  const range = parseDateRange(fromDateTimeParam, toDateTimeParam, {
    from: context.defaultFromDateTime,
    to: context.defaultToDateTime,
  });
  if (isDateRangeError(range)) {
    return range;
  }

  const counts = await aggregateMeterCounts(
    context.cabinetId,
    context.gamingLocation,
    range.fromDateTime,
    range.toDateTime
  );

  return {
    total: counts.total,
    transferred: counts.transferred,
    pending: counts.pending,
    eligibleCount: counts.eligible,
    targetLocation: {
      id: context.gamingLocation,
      name: context.locationName,
    },
    defaultFromDateTime: context.defaultFromDateTime,
    defaultToDateTime: context.defaultToDateTime,
    gameDayOffset: context.gameDayOffset,
    defaultConcurrency: getDefaultTransferMetersConcurrency(),
    defaultBatchSize: getDefaultTransferMetersBatchSize(),
  };
}

export async function transferMetersBatch(
  cabinetId: string,
  fromDateTimeIso: string,
  toDateTimeIso: string,
  options: {
    batchSize?: number;
    concurrency?: number;
    cursor?: string;
    activityTotal?: number;
    logActivity?: boolean;
    request: NextRequest;
    userId: string;
    username: string;
  }
): Promise<TransferMetersBatchResult | OperationError> {
  const context = await loadTransferMetersContext(cabinetId);
  if (isOperationError(context)) {
    return context;
  }

  const range = parseDateRange(fromDateTimeIso, toDateTimeIso);
  if (isDateRangeError(range)) {
    return range;
  }

  const concurrency = resolveConcurrency(options.concurrency);
  const chunkBatchSize = resolveChunkBatchSize(options.batchSize);
  const totalFetchLimit = concurrency * chunkBatchSize;

  const baseFilter = buildMismatchFilter(
    cabinetId,
    context.gamingLocation,
    range.fromDateTime,
    range.toDateTime,
    options.cursor
  );

  const meters = await Meters.find(baseFilter)
    .sort({ _id: 1 })
    .limit(totalFetchLimit)
    .select({ _id: 1 })
    .lean<{ _id: string }[]>();

  const remainingFilter = buildMismatchFilter(
    cabinetId,
    context.gamingLocation,
    range.fromDateTime,
    range.toDateTime
  );

  if (meters.length === 0) {
    const remaining = await Meters.countDocuments(remainingFilter);
    const totalEligible = await aggregateMeterCounts(
      cabinetId,
      context.gamingLocation,
      range.fromDateTime,
      range.toDateTime
    );
    return {
      updated: 0,
      remaining,
      totalEligible: totalEligible.eligible,
      concurrency,
    };
  }

  const now = new Date();
  const meterChunks = splitIntoChunks(meters, concurrency);

  const bulkResults = await Promise.all(
    meterChunks.map(chunk =>
      Meters.bulkWrite(
        chunk.map(meter => ({
          updateOne: {
            filter: { _id: meter._id },
            update: {
              $set: {
                location: context.gamingLocation,
                updatedAt: now,
              },
            },
          },
        }))
      )
    )
  );

  const updated = bulkResults.reduce(
    (sum, result) => sum + result.modifiedCount + result.upsertedCount,
    0
  );
  const lastId = meters[meters.length - 1]._id;
  const remaining = await Meters.countDocuments(remainingFilter);

  const totalEligibleRow = await aggregateMeterCounts(
    cabinetId,
    context.gamingLocation,
    range.fromDateTime,
    range.toDateTime
  );

  const shouldLogActivity =
    options.logActivity !== false && remaining === 0;
  const activityCount = (options.activityTotal ?? 0) + updated;

  if (shouldLogActivity && activityCount > 0) {
    try {
      await logActivity({
        action: 'UPDATE',
        details: `Transferred ${activityCount} meter(s) to location "${context.locationName}"`,
        ipAddress: getClientIP(options.request) || undefined,
        userAgent: options.request.headers.get('user-agent') || undefined,
        userId: options.userId,
        username: options.username,
        metadata: {
          resource: 'cabinet',
          resourceId: cabinetId,
          resourceName: cabinetId,
          changes: [
            {
              field: 'meter.location',
              oldValue: 'mismatched',
              newValue: context.gamingLocation,
            },
          ],
        },
      });
    } catch (logError) {
      console.error(
        '[transferMetersBatch] Failed to log activity:',
        logError instanceof Error ? logError.message : 'Unknown error'
      );
    }
  }

  return {
    updated,
    remaining,
    totalEligible: totalEligibleRow.eligible,
    nextCursor: remaining > 0 ? lastId : undefined,
    concurrency,
  };
}
