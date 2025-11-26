/**
 * Hourly Trends Helper Functions
 *
 * This module contains helper functions for hourly trends analytics.
 * It handles aggregation pipelines for hourly revenue trends.
 *
 * @module app/api/lib/helpers/hourlyTrends
 */

import { getDatesForTimePeriod } from '../utils/dates';
import type { TimePeriod } from '../types';
import type { Db } from 'mongodb';
import type { PipelineStage } from 'mongoose';

/**
 * Hourly data item type
 */
export type HourlyDataItem = {
  location: string;
  hour: number;
  revenue: number;
  drop: number;
  cancelledCredits: number;
};

/**
 * Daily revenue item type
 */
type DailyRevenueItem = {
  _id: { day: string };
  dailyRevenue: number;
};

/**
 * Calculates previous period date range
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param days - Number of days for previous period
 * @returns Previous period date range
 */
export function getPreviousPeriod(
  startDate: Date,
  endDate: Date,
  days: number
): { prevStart: Date; prevEnd: Date } {
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(
    prevEnd.getTime() - days * 24 * 60 * 60 * 1000 + 1
  );
  return { prevStart, prevEnd };
}

/**
 * Calculates date range for hourly trends
 *
 * @param timePeriod - Time period
 * @param startDateParam - Optional custom start date
 * @param endDateParam - Optional custom end date
 * @returns Date range object
 */
export function calculateHourlyTrendsDateRange(
  timePeriod: TimePeriod,
  startDateParam?: string | null,
  endDateParam?: string | null
): { startDate: Date; endDate: Date } {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
  } else {
    const dateRange = getDatesForTimePeriod(timePeriod);
    startDate = dateRange.startDate;
    endDate = dateRange.endDate;
  }

  if (!startDate || !endDate) {
    const now = new Date();
    endDate = now;
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
}

/**
 * Builds aggregation pipeline for current period revenue
 *
 * @param targetLocations - Array of location IDs
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Aggregation pipeline stages
 */
export function buildCurrentPeriodRevenuePipeline(
  targetLocations: string[],
  startDate: Date,
  endDate: Date
): PipelineStage[] {
  return [
    {
      $match: {
        location: { $in: targetLocations },
        readAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $subtract: [
              { $ifNull: ['$movement.drop', 0] },
              { $ifNull: ['$movement.totalCancelledCredits', 0] },
            ],
          },
        },
      },
    },
  ];
}

/**
 * Builds aggregation pipeline for previous period average daily revenue
 *
 * @param targetLocations - Array of location IDs
 * @param prevStart - Previous period start date
 * @param prevEnd - Previous period end date
 * @returns Aggregation pipeline stages
 */
export function buildPreviousPeriodPipeline(
  targetLocations: string[],
  prevStart: Date,
  prevEnd: Date
): PipelineStage[] {
  return [
    {
      $match: {
        location: { $in: targetLocations },
        readAt: { $gte: prevStart, $lte: prevEnd },
      },
    },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$readAt' } },
        },
        dailyRevenue: {
          $sum: {
            $subtract: [
              { $ifNull: ['$movement.drop', 0] },
              { $ifNull: ['$movement.totalCancelledCredits', 0] },
            ],
          },
        },
      },
    },
  ];
}

/**
 * Builds aggregation pipeline for hourly trends
 *
 * @param targetLocations - Array of location IDs
 * @param startDate - Start date
 * @param endDate - End date
 * @param licencee - Optional licensee to filter by
 * @returns Aggregation pipeline stages
 */
export function buildHourlyTrendsPipeline(
  targetLocations: string[],
  startDate: Date,
  endDate: Date,
  licencee?: string | null
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        location: { $in: targetLocations },
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
    { $unwind: '$machineDetails' },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: '$locationDetails' },
  ];

  if (licencee) {
    pipeline.push({
      $match: { 'locationDetails.rel.licencee': licencee },
    } as PipelineStage);
  }

  pipeline.push(
    {
      $group: {
        _id: {
          location: '$location',
          hour: { $hour: '$readAt' },
        },
        revenue: {
          $sum: {
            $subtract: [
              { $ifNull: ['$movement.drop', 0] },
              { $ifNull: ['$movement.totalCancelledCredits', 0] },
            ],
          },
        },
        drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        cancelledCredits: {
          $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
        },
      },
    },
    { $sort: { '_id.location': 1, '_id.hour': 1 } },
    {
      $project: {
        _id: 0,
        location: '$_id.location',
        hour: '$_id.hour',
        revenue: '$revenue',
        drop: '$drop',
        cancelledCredits: '$cancelledCredits',
      },
    }
  );

  return pipeline;
}

/**
 * Processes hourly data for single location
 *
 * @param hourlyData - Array of hourly data items
 * @returns Processed hourly trends array
 */
export function processSingleLocationHourlyData(
  hourlyData: HourlyDataItem[]
): Array<{ hour: string; revenue: number }> {
  return Array.from({ length: 24 }, (_, hour) => {
    const hourData = hourlyData.find(item => item.hour === hour);
    const revenue = hourData ? hourData.revenue : 0;
    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      revenue: Math.round(revenue),
    };
  });
}

/**
 * Processes hourly data for multiple locations
 *
 * @param hourlyData - Array of hourly data items
 * @param targetLocations - Array of location IDs
 * @returns Processed location data object
 */
export function processMultipleLocationsHourlyData(
  hourlyData: HourlyDataItem[],
  targetLocations: string[]
): Record<
  string,
  {
    hourlyTrends: Array<{ hour: string; revenue: number }>;
    totalRevenue: number;
    peakRevenue: number;
    avgRevenue: number;
  }
> {
  const locationData: Record<
    string,
    {
      hourlyTrends: Array<{ hour: string; revenue: number }>;
      totalRevenue: number;
      peakRevenue: number;
      avgRevenue: number;
    }
  > = {};

  const locationGroups: Record<string, HourlyDataItem[]> = {};
  for (const item of hourlyData) {
    const locationId = item.location;
    if (!locationGroups[locationId]) {
      locationGroups[locationId] = [];
    }
    locationGroups[locationId].push(item);
  }

  for (const locationId of targetLocations) {
    const locationHourlyData = locationGroups[locationId] || [];
    const hourlyTrends = processSingleLocationHourlyData(locationHourlyData);

    const totalRevenue = hourlyTrends.reduce(
      (sum, item) => sum + item.revenue,
      0
    );
    const peakRevenue = Math.max(...hourlyTrends.map(item => item.revenue));
    const avgRevenue = Math.round(totalRevenue / 24);

    locationData[locationId] = {
      hourlyTrends,
      totalRevenue,
      peakRevenue,
      avgRevenue,
    };
  }

  return locationData;
}

/**
 * Fetches hourly trends data
 *
 * @param db - Database connection
 * @param locationId - Optional single location ID
 * @param locationIds - Optional comma-separated location IDs
 * @param timePeriod - Time period
 * @param startDateParam - Optional custom start date
 * @param endDateParam - Optional custom end date
 * @param licencee - Optional licensee to filter by
 * @returns Hourly trends result
 */
export async function getHourlyTrends(
  db: Db,
  locationId: string | null,
  locationIds: string | null,
  timePeriod: TimePeriod,
  startDateParam?: string | null,
  endDateParam?: string | null,
  licencee?: string | null
): Promise<{
  currentPeriodRevenue: number;
  previousPeriodAverage: number;
  hourlyData: HourlyDataItem[];
  targetLocations: string[];
}> {
  const { startDate, endDate } = calculateHourlyTrendsDateRange(
    timePeriod,
    startDateParam,
    endDateParam
  );

  const targetLocations = locationIds
    ? locationIds.split(',').map(id => id.trim())
    : [locationId!];

  const currentPipeline = buildCurrentPeriodRevenuePipeline(
    targetLocations,
    startDate,
    endDate
  );
  const currentResult = await db
    .collection('meters')
    .aggregate(currentPipeline)
    .toArray();
  const currentPeriodRevenue = currentResult[0]?.totalRevenue || 0;

  const days = 7;
  const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate, days);
  const prevPipeline = buildPreviousPeriodPipeline(
    targetLocations,
    prevStart,
    prevEnd
  );
  const prevResult = (await db
    .collection('meters')
    .aggregate(prevPipeline)
    .toArray()) as DailyRevenueItem[];
  const prevDays = prevResult.length;
  const prevTotal = prevResult.reduce(
    (sum: number, d: DailyRevenueItem) => sum + (d.dailyRevenue || 0),
    0
  );
  const previousPeriodAverage = prevDays > 0 ? prevTotal / prevDays : 0;

  const hourlyPipeline = buildHourlyTrendsPipeline(
    targetLocations,
    startDate,
    endDate,
    licencee
  );
  const hourlyData = (await db
    .collection('meters')
    .aggregate(hourlyPipeline)
    .toArray()) as HourlyDataItem[];

  return {
    currentPeriodRevenue,
    previousPeriodAverage,
    hourlyData,
    targetLocations,
  };
}

