/**
 * Manufacturer Performance Helper Functions
 *
 * This module contains helper functions for manufacturer performance analytics.
 * It handles aggregation pipelines for manufacturer performance data.
 *
 * @module app/api/lib/helpers/manufacturerPerformance
 */

import type { Db } from 'mongodb';
import type { PipelineStage } from 'mongoose';
import { Meters } from '../models/meters';
import type { TimePeriod } from '../types';
import { getDatesForTimePeriod } from '../utils/dates';

/**
 * Manufacturer data item from aggregation
 */
export type ManufacturerDataItem = {
  _id: string;
  totalMachines: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
};

/**
 * Manufacturer performance result item
 */
export type ManufacturerPerformanceItem = {
  manufacturer: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
};

/**
 * Calculates date range for manufacturer performance query
 *
 * @param timePeriod - Time period
 * @param startDate - Optional custom start date
 * @param endDate - Optional custom end date
 * @returns Date range object
 */
function calculateManufacturerDateRange(
  timePeriod: TimePeriod,
  startDate?: string | null,
  endDate?: string | null
): { startDate: Date; endDate: Date } {
  let startDateFilter: Date | undefined;
  let endDateFilter: Date | undefined;

  if (startDate && endDate) {
    startDateFilter = new Date(startDate);
    endDateFilter = new Date(endDate);
  } else {
    const dateRange = getDatesForTimePeriod(timePeriod);
    startDateFilter = dateRange.startDate;
    endDateFilter = dateRange.endDate;
  }

  if (!startDateFilter || !endDateFilter) {
    const now = new Date();
    endDateFilter = now;
    startDateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  return { startDate: startDateFilter, endDate: endDateFilter };
}

/**
 * Builds aggregation pipeline for manufacturer performance
 *
 * @param locationId - Location ID to filter by
 * @param startDate - Start date
 * @param endDate - End date
 * @param licencee - Optional licensee to filter by
 * @returns Aggregation pipeline stages
 */
function buildManufacturerPerformancePipeline(
  locationId: string,
  startDate: Date,
  endDate: Date,
  licencee?: string | null
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        readAt: { $gte: startDate, $lte: endDate },
        location: locationId,
      },
    },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    {
      $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: 'machines',
        localField: 'machine',
        foreignField: '_id',
        as: 'machineDetails',
      },
    },
    {
      $unwind: { path: '$machineDetails', preserveNullAndEmptyArrays: true },
    },
  ];

  if (licencee && licencee !== 'all') {
    pipeline.push({
      $match: {
        'locationDetails.rel.licencee': licencee,
      },
    } as PipelineStage);
  }

  pipeline.push(
    {
      $group: {
        _id: {
          $cond: [
            {
              $and: [
                { $ne: ['$machineDetails.manufacturer', null] },
                { $ne: ['$machineDetails.manufacturer', ''] },
              ],
            },
            '$machineDetails.manufacturer',
            '$machineDetails.manuf',
          ],
        },
        totalMachines: { $addToSet: '$machine' },
        totalHandle: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
        totalWin: {
          $sum: {
            $subtract: [
              { $ifNull: ['$movement.coinIn', 0] },
              { $ifNull: ['$movement.coinOut', 0] },
            ],
          },
        },
        totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
        },
        totalGross: { $sum: { $ifNull: ['$movement.gross', 0] } },
      },
    },
    {
      $addFields: {
        totalMachines: { $size: '$totalMachines' },
      },
    },
    {
      $sort: { totalHandle: -1 },
    }
  );

  return pipeline;
}

/**
 * Calculates totals from manufacturer data
 *
 * @param manufacturerData - Array of manufacturer data items
 * @returns Totals object
 */
function calculateManufacturerTotals(
  manufacturerData: ManufacturerDataItem[]
): {
  totalMachines: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
} {
  return manufacturerData.reduce(
    (acc, item) => {
      acc.totalMachines += item.totalMachines;
      acc.totalHandle += item.totalHandle;
      acc.totalWin += item.totalWin;
      acc.totalDrop += item.totalDrop;
      acc.totalCancelledCredits += item.totalCancelledCredits;
      acc.totalGross += item.totalGross;
      return acc;
    },
    {
      totalMachines: 0,
      totalHandle: 0,
      totalWin: 0,
      totalDrop: 0,
      totalCancelledCredits: 0,
      totalGross: 0,
    }
  );
}

/**
 * Calculates percentages for manufacturer performance
 *
 * @param manufacturerData - Array of manufacturer data items
 * @param totals - Totals object
 * @returns Array of manufacturer performance items with percentages
 */
function calculateManufacturerPercentages(
  manufacturerData: ManufacturerDataItem[],
  totals: ReturnType<typeof calculateManufacturerTotals>
): ManufacturerPerformanceItem[] {
  return manufacturerData.map(item => ({
    manufacturer: item._id || 'Unknown',
    floorPositions:
      totals.totalMachines > 0
        ? Math.round((item.totalMachines / totals.totalMachines) * 100)
        : 0,
    totalHandle:
      totals.totalHandle > 0
        ? Math.round((item.totalHandle / totals.totalHandle) * 100)
        : 0,
    totalWin:
      totals.totalWin > 0
        ? Math.round((item.totalWin / totals.totalWin) * 100)
        : 0,
    totalDrop:
      totals.totalDrop > 0
        ? Math.round((item.totalDrop / totals.totalDrop) * 100)
        : 0,
    totalCancelledCredits:
      totals.totalCancelledCredits > 0
        ? Math.round(
            (item.totalCancelledCredits / totals.totalCancelledCredits) * 100
          )
        : 0,
    totalGross:
      totals.totalGross > 0
        ? Math.round((item.totalGross / totals.totalGross) * 100)
        : 0,
  }));
}

/**
 * Fetches manufacturer performance data
 *
 * @param db - Database connection
 * @param locationId - Location ID to filter by
 * @param timePeriod - Time period
 * @param startDate - Optional custom start date
 * @param endDate - Optional custom end date
 * @param licencee - Optional licensee to filter by
 * @returns Array of manufacturer performance items
 */
export async function getManufacturerPerformance(
  db: Db,
  locationId: string,
  timePeriod: TimePeriod,
  startDate?: string | null,
  endDate?: string | null,
  licencee?: string | null
): Promise<ManufacturerPerformanceItem[]> {
  const { startDate: startDateFilter, endDate: endDateFilter } =
    calculateManufacturerDateRange(timePeriod, startDate, endDate);

  const pipeline = buildManufacturerPerformancePipeline(
    locationId,
    startDateFilter,
    endDateFilter,
    licencee
  );

  const manufacturerData: ManufacturerDataItem[] = [];
  const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });
  for await (const doc of cursor) {
    manufacturerData.push(doc as ManufacturerDataItem);
  }

  const totals = calculateManufacturerTotals(manufacturerData);
  return calculateManufacturerPercentages(manufacturerData, totals);
}
