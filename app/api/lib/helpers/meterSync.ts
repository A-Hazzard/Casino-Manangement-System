/**
 * Meter Sync Helper
 *
 * This file contains helper functions for syncing meter data with collections,
 * including calculating SAS metrics from meter data.
 */

import { CollectionReport } from '../models/collectionReport';
import { Collections } from '../models/collections';
import { Meters } from '../models/meters';

type CollectionSasMetrics = {
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  sasStartTime: string;
  sasEndTime: string;
};

type MeterSyncResult = {
  machineId: string;
  collectionId: string;
  metersProcessed: number;
  calculatedValues: {
    drop: number;
    totalCancelledCredits: number;
    gross: number;
  };
  movementCalculation: {
    firstMeter: {
      drop: number;
      cancelled: number;
      readAt: Date;
    };
    lastMeter: {
      drop: number;
      cancelled: number;
      readAt: Date;
    };
    movement: {
      drop: number;
      cancelled: number;
    };
  };
  timePeriod: {
    start: string;
    end: string;
  };
};

/**
 * Calculates SAS metrics from meter data within a time period
 *
 * @param machineId - The machine ID
 * @param sasStartTime - Start time of the SAS period
 * @param sasEndTime - End time of the SAS period
 * @returns Promise<CollectionSasMetrics | null>
 */
async function calculateSasMetricsFromMeters(
  machineId: string,
  sasStartTime: Date,
  sasEndTime: Date
): Promise<CollectionSasMetrics | null> {
  // Fetch all meters within SAS period
  const metersInPeriod = await Meters.find({
    machine: machineId,
    readAt: { $gte: sasStartTime, $lte: sasEndTime },
  }).sort({ readAt: 1 }); // Sort ascending to get chronological order

  if (metersInPeriod.length === 0) {
    return null;
  }

  // Calculate movement (first→last meter)
  const firstMeter = metersInPeriod[0];
  const lastMeter = metersInPeriod[metersInPeriod.length - 1];

  const dropMovement =
    (lastMeter.movement?.drop || 0) - (firstMeter.movement?.drop || 0);
  const cancelledMovement =
    (lastMeter.movement?.totalCancelledCredits || 0) -
    (firstMeter.movement?.totalCancelledCredits || 0);
  const sasGross = dropMovement - cancelledMovement;

  return {
    drop: dropMovement,
    totalCancelledCredits: cancelledMovement,
    gross: sasGross,
    sasStartTime: sasStartTime.toISOString(),
    sasEndTime: sasEndTime.toISOString(),
  };
}

/**
 * Syncs SAS metrics for a single collection
 *
 * @param collection - The collection document
 * @returns Promise<MeterSyncResult | null>
 */
async function syncCollectionSasMetrics(collection: {
  _id: string;
  machineId?: string;
  sasMeters?: {
    sasStartTime?: string;
    sasEndTime?: string;
  };
}): Promise<MeterSyncResult | null> {
  const machineId = collection.machineId;
  if (!machineId) {
    return null;
  }

  // Determine SAS time period for this collection
  const sasStartTime = collection.sasMeters?.sasStartTime
    ? new Date(collection.sasMeters.sasStartTime)
    : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24 hours ago

  const sasEndTime = collection.sasMeters?.sasEndTime
    ? new Date(collection.sasMeters.sasEndTime)
    : new Date(); // Default to current time

  // Calculate SAS metrics from meters
  const sasMetrics = await calculateSasMetricsFromMeters(
    machineId,
    sasStartTime,
    sasEndTime
  );

  if (!sasMetrics) {
    return null;
  }

  // Fetch meters for result details
  const metersInPeriod = await Meters.find({
    machine: machineId,
    readAt: { $gte: sasStartTime, $lte: sasEndTime },
  }).sort({ readAt: 1 });

  const firstMeter = metersInPeriod[0];
  const lastMeter = metersInPeriod[metersInPeriod.length - 1];

  // Update collection with new data
  const updateResult = await Collections.updateOne(
    { _id: collection._id },
    {
      $set: {
        'sasMeters.drop': sasMetrics.drop,
        'sasMeters.totalCancelledCredits': sasMetrics.totalCancelledCredits,
        'sasMeters.gross': sasMetrics.gross,
        'sasMeters.sasStartTime': sasMetrics.sasStartTime,
        'sasMeters.sasEndTime': sasMetrics.sasEndTime,
      },
    }
  );

  if (updateResult.modifiedCount === 0) {
    return null;
  }

  return {
    machineId,
    collectionId: collection._id.toString(),
    metersProcessed: metersInPeriod.length,
    calculatedValues: {
      drop: sasMetrics.drop,
      totalCancelledCredits: sasMetrics.totalCancelledCredits,
      gross: sasMetrics.gross,
    },
    movementCalculation: {
      firstMeter: {
        drop: firstMeter.movement?.drop || 0,
        cancelled: firstMeter.movement?.totalCancelledCredits || 0,
        readAt: firstMeter.readAt,
      },
      lastMeter: {
        drop: lastMeter.movement?.drop || 0,
        cancelled: lastMeter.movement?.totalCancelledCredits || 0,
        readAt: lastMeter.readAt,
      },
      movement: {
        drop: sasMetrics.drop,
        cancelled: sasMetrics.totalCancelledCredits,
      },
    },
    timePeriod: {
      start: sasMetrics.sasStartTime,
      end: sasMetrics.sasEndTime,
    },
  };
}

/**
 * Syncs SAS metrics for all collections in a report
 *
 * @param reportId - The collection report ID
 * @returns Promise<{ updatedCollections: number; results: MeterSyncResult[]; totals: { drop: number; cancelled: number; gross: number } }>
 */
export async function syncReportMeters(reportId: string): Promise<{
  updatedCollections: number;
  results: MeterSyncResult[];
  totals: { drop: number; cancelled: number; gross: number };
}> {
  const collections = await Collections.find({
    locationReportId: reportId,
  });

  if (collections.length === 0) {
    return {
      updatedCollections: 0,
      results: [],
      totals: { drop: 0, cancelled: 0, gross: 0 },
    };
  }

  const results: MeterSyncResult[] = [];
  let reportTotalDrop = 0;
  let reportTotalCancelled = 0;
  let reportTotalGross = 0;

  // Process each collection
  for (const collection of collections) {
    const syncResult = await syncCollectionSasMetrics(collection);

    if (syncResult) {
      results.push(syncResult);
      reportTotalDrop += syncResult.calculatedValues.drop;
      reportTotalCancelled += syncResult.calculatedValues.totalCancelledCredits;
      reportTotalGross += syncResult.calculatedValues.gross;
    }
  }

  // Update collection report totals
  if (results.length > 0) {
    await CollectionReport.updateOne(
      { locationReportId: reportId },
      {
        $set: {
          totalDrop: reportTotalDrop,
          totalCancelled: reportTotalCancelled,
          totalGross: reportTotalGross,
          totalSasGross: reportTotalGross,
          lastSyncedAt: new Date(),
        },
      }
    );
  }

  return {
    updatedCollections: results.length,
    results,
    totals: {
      drop: reportTotalDrop,
      cancelled: reportTotalCancelled,
      gross: reportTotalGross,
    },
  };
}

