/**
 * Top Machines Helper Functions
 *
 * This module contains helper functions for top machines analytics.
 * It handles aggregation pipelines for finding top performing machines.
 *
 * @module app/api/lib/helpers/topMachines
 */

import { getDatesForTimePeriod } from '../utils/dates';
import type { TimePeriod } from '../types';
import type { Db } from 'mongodb';
import type { PipelineStage } from 'mongoose';

/**
 * Top machines query parameters
 */
export type TopMachinesParams = {
  locationId: string;
  timePeriod: string;
  startDate?: string | null;
  endDate?: string | null;
};

/**
 * Calculates date range for top machines query
 *
 * @param timePeriod - Time period string
 * @param startDate - Optional custom start date
 * @param endDate - Optional custom end date
 * @returns Date range object
 */
export function calculateTopMachinesDateRange(
  timePeriod: string,
  startDate?: string | null,
  endDate?: string | null
): { start: Date; end: Date } {
  const now = new Date();

  if (timePeriod === 'Custom' && startDate && endDate) {
    const customStartDate = new Date(startDate + 'T00:00:00-04:00');
    const customEndDate = new Date(endDate + 'T23:59:59-04:00');
    return {
      start: new Date(customStartDate.getTime()),
      end: new Date(customEndDate.getTime()),
    };
  }

  switch (timePeriod) {
    case '24h':
      return {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        end: now,
      };
    case '7d':
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: now,
      };
    case '30d':
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      };
    default:
      return {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        end: now,
      };
  }
}

/**
 * Builds aggregation pipeline for top machines by location
 *
 * @param locationId - Location ID to filter by
 * @param start - Start date
 * @param end - End date
 * @returns Aggregation pipeline stages
 */
export function buildTopMachinesPipeline(
  locationId: string,
  start: Date,
  end: Date
): PipelineStage[] {
  return [
    {
      $match: {
        location: locationId,
        readAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$machine',
        totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
        },
        totalGamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'machines',
        localField: '_id',
        foreignField: '_id',
        as: 'machineInfo',
      },
    },
    {
      $unwind: {
        path: '$machineInfo',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        id: '$_id',
        name: { $ifNull: ['$machineInfo.serialNumber', 'Unknown Machine'] },
        revenue: { $subtract: ['$totalDrop', '$totalCancelledCredits'] },
        drop: '$totalDrop',
        cancelledCredits: '$totalCancelledCredits',
        gamesPlayed: '$totalGamesPlayed',
        count: 1,
        hold: {
          $cond: [
            { $gt: ['$totalDrop', 0] },
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ['$totalDrop', '$totalCancelledCredits'] },
                    '$totalDrop',
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $sort: { revenue: -1 },
    },
    {
      $limit: 5,
    },
  ];
}

/**
 * Fetches top machines for a location
 *
 * @param db - Database connection
 * @param locationId - Location ID to filter by
 * @param timePeriod - Time period string
 * @param startDate - Optional custom start date
 * @param endDate - Optional custom end date
 * @returns Array of top machines
 */
export async function getTopMachinesByLocation(
  db: Db,
  locationId: string,
  timePeriod: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<unknown[]> {
  const { start, end } = calculateTopMachinesDateRange(
    timePeriod,
    startDate,
    endDate
  );
  const pipeline = buildTopMachinesPipeline(locationId, start, end);

  return await db.collection('meters').aggregate(pipeline).toArray();
}

/**
 * Builds aggregation pipeline for top machines with detailed metrics
 *
 * @param timePeriod - Time period
 * @param startDate - Start date
 * @param endDate - End date
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @param limit - Limit for results
 * @returns Aggregation pipeline stages
 */
export function buildTopMachinesDetailedPipeline(
  timePeriod: string,
  startDate: Date,
  endDate: Date,
  licencee?: string | null,
  locationIds?: string | null,
  limit: number = 5
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        readAt: { $gte: startDate, $lte: endDate },
      },
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
      $unwind: '$machineDetails',
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
      $unwind: '$locationDetails',
    },
  ];

  if (licencee) {
    pipeline.push({
      $match: {
        'locationDetails.rel.licencee': licencee,
      },
    } as PipelineStage);
  }

  if (locationIds) {
    pipeline.push({
      $match: {
        location: { $in: locationIds.split(',').map(id => id.trim()) },
      },
    } as PipelineStage);
  }

  pipeline.push(
    {
      $group: {
        _id: '$machine',
        locationId: { $first: '$location' },
        locationName: { $first: '$locationDetails.name' },
        serialNumber: { $first: '$machineDetails.serialNumber' },
        customName: { $first: '$machineDetails.custom.name' },
        machineDocumentId: { $first: '$machine' },
        game: { $first: '$machineDetails.game' },
        manufacturer: {
          $first: {
            $cond: [
              {
                $and: [
                  { $ne: ['$machineDetails.manufacturer', null] },
                  { $ne: ['$machineDetails.manufacturer', ''] },
                ],
              },
              '$machineDetails.manufacturer',
              {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$machineDetails.manuf', null] },
                      { $ne: ['$machineDetails.manuf', ''] },
                    ],
                  },
                  '$machineDetails.manuf',
                  'Not Specified',
                ],
              },
            ],
          },
        },
        handle: { $sum: { $ifNull: ['$movement.drop', 0] } },
        winLoss: {
          $sum: {
            $subtract: [
              { $ifNull: ['$movement.drop', 0] },
              { $ifNull: ['$movement.totalCancelledCredits', 0] },
            ],
          },
        },
        jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
        avgWagerPerGame: {
          $avg: {
            $cond: [
              { $gt: [{ $ifNull: ['$movement.gamesPlayed', 0] }, 0] },
              {
                $divide: [
                  { $ifNull: ['$movement.drop', 0] },
                  { $ifNull: ['$movement.gamesPlayed', 1] },
                ],
              },
              0,
            ],
          },
        },
        actualHold: {
          $avg: {
            $cond: [
              { $gt: [{ $ifNull: ['$movement.drop', 0] }, 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $ifNull: ['$movement.drop', 0] },
                          { $ifNull: ['$movement.totalCancelledCredits', 0] },
                        ],
                      },
                      { $ifNull: ['$movement.drop', 1] },
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
        gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
      },
    },
    {
      $sort: { handle: -1 },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 0,
        locationId: '$locationId',
        locationName: { $ifNull: ['$locationName', 'Unknown Location'] },
        serialNumber: { $ifNull: ['$serialNumber', ''] },
        customName: { $ifNull: ['$customName', ''] },
        machineDocumentId: '$machineDocumentId',
        machineId: {
          $cond: {
            if: {
              $and: [
                { $ne: [{ $trim: { input: { $ifNull: ['$customName', ''] } } }, ''] },
                { $ne: [{ $trim: { input: { $ifNull: ['$serialNumber', ''] } } }, ''] },
                { $ne: [{ $trim: { input: { $ifNull: ['$customName', ''] } } }, { $trim: { input: { $ifNull: ['$serialNumber', ''] } } }] },
              ],
            },
            then: {
              $concat: [
                { $trim: { input: { $ifNull: ['$customName', ''] } } },
                ' (',
                { $trim: { input: { $ifNull: ['$serialNumber', ''] } } },
                ')',
              ],
            },
            else: {
              $cond: {
                if: { $ne: [{ $trim: { input: { $ifNull: ['$serialNumber', ''] } } }, ''] },
                then: { $trim: { input: { $ifNull: ['$serialNumber', ''] } } },
                else: {
                  $cond: {
                    if: { $ne: [{ $trim: { input: { $ifNull: ['$customName', ''] } } }, ''] },
                    then: { $trim: { input: { $ifNull: ['$customName', ''] } } },
                    else: {
                      $concat: [
                        'Machine ',
                        { $substr: ['$machineDocumentId', { $subtract: [{ $strLenCP: '$machineDocumentId' }, 6] }, 6] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        game: { $ifNull: ['$game', 'Unknown Game'] },
        manufacturer: { $ifNull: ['$manufacturer', 'Not Specified'] },
        handle: { $round: ['$handle', 2] },
        totalDrop: { $round: ['$handle', 2] },
        winLoss: { $round: ['$winLoss', 2] },
        jackpot: { $round: ['$jackpot', 2] },
        avgWagerPerGame: { $round: ['$avgWagerPerGame', 2] },
        actualHold: { $round: ['$actualHold', 2] },
        gamesPlayed: '$gamesPlayed',
      },
    }
  );

  return pipeline;
}

/**
 * Fetches top machines with detailed metrics
 *
 * @param db - Database connection
 * @param timePeriod - Time period
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @param limit - Limit for results
 * @returns Array of top machines with detailed metrics
 */
export async function getTopMachinesDetailed(
  db: Db,
  timePeriod: string,
  licencee?: string | null,
  locationIds?: string | null,
  limit: number = 5
): Promise<unknown[]> {
  const { startDate, endDate } = getDatesForTimePeriod(timePeriod as TimePeriod);
  const pipeline = buildTopMachinesDetailedPipeline(
    timePeriod,
    startDate!,
    endDate!,
    licencee,
    locationIds,
    limit
  );

  return await db.collection('meters').aggregate(pipeline).toArray();
}

