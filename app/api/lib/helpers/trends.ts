/**
 * Trends Helper Functions
 *
 * This module contains helper functions for trends analytics.
 * It handles aggregation pipelines for win/loss and plays trends.
 *
 * @module app/api/lib/helpers/trends
 */

import type { Db } from 'mongodb';
import type { PipelineStage } from 'mongoose';
import { CollectionReport } from '../models/collectionReport';
import { Meters } from '../models/meters';
import type { TimePeriod } from '../types';
import { getDatesForTimePeriod } from '../utils/dates';

/**
 * Win/loss trend data item
 */
export type WinLossTrendItem = {
  time: string;
  winLoss: number;
};

/**
 * Plays trend data item
 */
export type PlaysTrendItem = {
  time: string;
  gamesPlayed: number;
};

/**
 * Builds aggregation pipeline for win/loss trends
 *
 * @param timePeriod - Time period
 * @param startDate - Start date
 * @param endDate - End date
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @returns Aggregation pipeline stages
 */
function buildWinLossTrendsPipeline(
  timePeriod: TimePeriod,
  startDate: Date,
  endDate: Date,
  licencee?: string | null,
  locationIds?: string | null
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        readAt: { $gte: startDate, $lte: endDate },
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

  const dateFormat =
    timePeriod === 'Today' || timePeriod === 'Yesterday' ? '%H:00' : '%Y-%m-%d';

  pipeline.push(
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: '$readAt',
          },
        },
        winLoss: {
          $sum: {
            $subtract: [
              { $ifNull: ['$movement.drop', 0] },
              { $ifNull: ['$movement.totalCancelledCredits', 0] },
            ],
          },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $project: {
        _id: 0,
        time: '$_id',
        winLoss: '$winLoss',
      },
    }
  );

  return pipeline;
}

/**
 * Builds aggregation pipeline for plays trends
 *
 * @param timePeriod - Time period
 * @param startDate - Start date
 * @param endDate - End date
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @returns Aggregation pipeline stages
 */
function buildPlaysTrendsPipeline(
  timePeriod: TimePeriod,
  startDate: Date,
  endDate: Date,
  licencee?: string | null,
  locationIds?: string | null
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        readAt: { $gte: startDate, $lte: endDate },
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

  const dateFormat =
    timePeriod === 'Today' || timePeriod === 'Yesterday' ? '%H:00' : '%Y-%m-%d';

  pipeline.push(
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: '$readAt',
          },
        },
        gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $project: {
        _id: 0,
        time: '$_id',
        gamesPlayed: '$gamesPlayed',
      },
    }
  );

  return pipeline;
}

/**
 * Fetches win/loss trends data
 *
 * @param db - Database connection
 * @param timePeriod - Time period
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @returns Array of win/loss trend items
 */
export async function getWinLossTrends(
  db: Db,
  timePeriod: TimePeriod,
  licencee?: string | null,
  locationIds?: string | null
): Promise<WinLossTrendItem[]> {
  const { startDate, endDate } = getDatesForTimePeriod(timePeriod);
  if (!startDate || !endDate) {
    return [];
  }

  const pipeline = buildWinLossTrendsPipeline(
    timePeriod,
    startDate,
    endDate,
    licencee,
    locationIds
  );

  // Use cursor for Meters aggregation
  const results: WinLossTrendItem[] = [];
  const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });
  for await (const doc of cursor) {
    results.push(doc as WinLossTrendItem);
  }
  return results;
}

/**
 * Fetches plays trends data
 *
 * @param db - Database connection
 * @param timePeriod - Time period
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @returns Array of plays trend items
 */
export async function getPlaysTrends(
  db: Db,
  timePeriod: TimePeriod,
  licencee?: string | null,
  locationIds?: string | null
): Promise<PlaysTrendItem[]> {
  const { startDate, endDate } = getDatesForTimePeriod(timePeriod);
  if (!startDate || !endDate) {
    return [];
  }

  const pipeline = buildPlaysTrendsPipeline(
    timePeriod,
    startDate,
    endDate,
    licencee,
    locationIds
  );

  // Use cursor for Meters aggregation
  const results: PlaysTrendItem[] = [];
  const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });
  for await (const doc of cursor) {
    results.push(doc as PlaysTrendItem);
  }
  return results;
}

/**
 * Hourly revenue data item
 */
export type HourlyRevenueItem = {
  hour: number;
  revenue: number;
  drop: number;
  cancelledCredits: number;
};

/**
 * Hourly data item from aggregation
 */
type HourlyDataItem = {
  _id: number;
  avgRevenue: number;
  totalRevenue: number;
  avgDrop: number;
  totalDrop: number;
  avgCancelledCredits: number;
  totalCancelledCredits: number;
};

/**
 * Calculate date range based on time period
 *
 * @param timePeriod - Time period ('24h', '7d', '30d', 'Custom')
 * @param startDate - Custom start date (if Custom period)
 * @param endDate - Custom end date (if Custom period)
 * @returns Date range object
 */
function calculateHourlyRevenueDateRange(
  timePeriod: string,
  startDate?: string | null,
  endDate?: string | null
): { start: Date; end: Date } {
  const now = new Date();

  if (timePeriod === 'Custom' && startDate && endDate) {
    // Parse custom dates and apply timezone handling
    // Create dates in Trinidad timezone (UTC-4)
    const customStartDate = new Date(startDate + 'T00:00:00-04:00');
    const customEndDate = new Date(endDate + 'T23:59:59-04:00');

    // Convert to UTC for database queries
    return {
      start: new Date(customStartDate.getTime()),
      end: new Date(customEndDate.getTime()),
    };
  }

  let hoursBack = 24;
  switch (timePeriod) {
    case '7d':
      hoursBack = 7 * 24;
      break;
    case '30d':
      hoursBack = 30 * 24;
      break;
    default:
      hoursBack = 24;
  }

  return {
    start: new Date(now.getTime() - hoursBack * 60 * 60 * 1000),
    end: now,
  };
}

/**
 * Build aggregation pipeline for hourly revenue data
 *
 * @param locationId - Location ID
 * @param start - Start date
 * @param end - End date
 * @returns Aggregation pipeline stages
 */
function buildHourlyRevenuePipeline(
  locationId: string,
  start: Date,
  end: Date
): PipelineStage[] {
  return [
    // Stage 1: Filter collection reports by location, date range, and exclude deleted records
    {
      $match: {
        location: locationId,
        readAt: { $gte: start, $lte: end },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      },
    },
    // Stage 2: Group by hour and date to aggregate daily revenue metrics
    {
      $group: {
        _id: {
          hour: { $hour: '$createdAt' },
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        },
        revenue: { $sum: '$gross' },
        drop: { $sum: '$moneyIn' },
        cancelledCredits: { $sum: '$moneyOut' },
      },
    },
    // Stage 3: Group by hour to calculate average and total metrics across all days
    {
      $group: {
        _id: '$_id.hour',
        avgRevenue: { $avg: '$revenue' },
        totalRevenue: { $sum: '$revenue' },
        avgDrop: { $avg: '$drop' },
        totalDrop: { $sum: '$drop' },
        avgCancelledCredits: { $avg: '$cancelledCredits' },
        totalCancelledCredits: { $sum: '$cancelledCredits' },
      },
    },
    // Stage 4: Sort by hour for chronological order (0-23)
    {
      $sort: { _id: 1 },
    },
  ];
}

/**
 * Format hourly revenue data into 24-hour array
 *
 * @param hourlyData - Aggregated hourly data
 * @returns Formatted 24-hour array
 */
function formatHourlyRevenueData(
  hourlyData: HourlyDataItem[]
): HourlyRevenueItem[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const hourData = hourlyData.find(d => d._id === hour);
    return {
      hour,
      revenue: hourData ? hourData.avgRevenue : 0,
      drop: hourData ? hourData.avgDrop : 0,
      cancelledCredits: hourData ? hourData.avgCancelledCredits : 0,
    };
  });
}

/**
 * Get hourly revenue data for a location
 *
 * @param db - Database connection
 * @param locationId - Location ID
 * @param timePeriod - Time period ('24h', '7d', '30d', 'Custom')
 * @param startDate - Custom start date (if Custom period)
 * @param endDate - Custom end date (if Custom period)
 * @returns Array of hourly revenue items
 */
export async function getHourlyRevenue(
  db: Db,
  locationId: string,
  timePeriod: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<HourlyRevenueItem[]> {
  const { start, end } = calculateHourlyRevenueDateRange(
    timePeriod,
    startDate,
    endDate
  );

  const pipeline = buildHourlyRevenuePipeline(locationId, start, end);
  const hourlyData = (await CollectionReport.aggregate(
    pipeline
  ).exec()) as HourlyDataItem[];

  return formatHourlyRevenueData(hourlyData);
}

/**
 * Handle trend data item
 */
export type HandleTrendItem = {
  time: string;
  handle: number;
};

/**
 * Build aggregation pipeline for handle trends
 *
 * @param timePeriod - Time period
 * @param startDate - Start date
 * @param endDate - End date
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @returns Aggregation pipeline stages
 */
function buildHandleTrendsPipeline(
  timePeriod: TimePeriod,
  startDate: Date,
  endDate: Date,
  licencee?: string | null,
  locationIds?: string | null
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        readAt: { $gte: startDate, $lte: endDate },
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

  const dateFormat =
    timePeriod === 'Today' || timePeriod === 'Yesterday' ? '%H:00' : '%Y-%m-%d';

  pipeline.push(
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: '$readAt',
          },
        },
        handle: { $sum: { $ifNull: ['$movement.drop', 0] } },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $project: {
        _id: 0,
        time: '$_id',
        handle: '$handle',
      },
    }
  );

  return pipeline;
}

/**
 * Get handle trends data
 *
 * @param db - Database connection
 * @param timePeriod - Time period
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @returns Array of handle trend items
 */
export async function getHandleTrends(
  db: Db,
  timePeriod: TimePeriod,
  licencee?: string | null,
  locationIds?: string | null
): Promise<HandleTrendItem[]> {
  const { startDate, endDate } = getDatesForTimePeriod(timePeriod);
  if (!startDate || !endDate) {
    return [];
  }

  const pipeline = buildHandleTrendsPipeline(
    timePeriod,
    startDate,
    endDate,
    licencee,
    locationIds
  );

  // Use cursor for Meters aggregation
  const results: HandleTrendItem[] = [];
  const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });
  for await (const doc of cursor) {
    results.push(doc as HandleTrendItem);
  }
  return results;
}

/**
 * Jackpot trend data item
 */
export type JackpotTrendItem = {
  time: string;
  jackpot: number;
};

/**
 * Build aggregation pipeline for jackpot trends
 *
 * @param timePeriod - Time period
 * @param startDate - Start date
 * @param endDate - End date
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @returns Aggregation pipeline stages
 */
function buildJackpotTrendsPipeline(
  timePeriod: TimePeriod,
  startDate: Date,
  endDate: Date,
  licencee?: string | null,
  locationIds?: string | null
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        readAt: { $gte: startDate, $lte: endDate },
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

  const dateFormat =
    timePeriod === 'Today' || timePeriod === 'Yesterday' ? '%H:00' : '%Y-%m-%d';

  pipeline.push(
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: '$readAt',
          },
        },
        jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $project: {
        _id: 0,
        time: '$_id',
        jackpot: '$jackpot',
      },
    }
  );

  return pipeline;
}

/**
 * Get jackpot trends data
 *
 * @param db - Database connection
 * @param timePeriod - Time period
 * @param licencee - Optional licensee to filter by
 * @param locationIds - Optional comma-separated location IDs
 * @returns Array of jackpot trend items
 */
export async function getJackpotTrends(
  db: Db,
  timePeriod: TimePeriod,
  licencee?: string | null,
  locationIds?: string | null
): Promise<JackpotTrendItem[]> {
  const { startDate, endDate } = getDatesForTimePeriod(timePeriod);
  if (!startDate || !endDate) {
    return [];
  }

  const pipeline = buildJackpotTrendsPipeline(
    timePeriod,
    startDate,
    endDate,
    licencee,
    locationIds
  );

  // Use cursor for Meters aggregation
  const results: JackpotTrendItem[] = [];
  const cursor = Meters.aggregate(pipeline).cursor({ batchSize: 1000 });
  for await (const doc of cursor) {
    results.push(doc as JackpotTrendItem);
  }
  return results;
}
