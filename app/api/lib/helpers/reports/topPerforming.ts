import { Meters } from '@/app/api/lib/models/meters';
import type { QueryFilter, TimePeriod } from '@/lib/types/api';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
// Note: Db type from mongodb not imported to avoid mongoose/mongodb version mismatch
import type { PipelineStage } from 'mongoose';
import type { TopPerformingTab } from '@/shared/types/reports';

/**
 * Fetches the top 5 performing locations or Cabinets based on total moneyIn (drop).
 *
 * @param db - MongoDB database instance.
 * @param activeTab - The current tab the user is on ("locations" or "Cabinets").
 * @param timePeriod - The time range (e.g., "7d", "30d", "Custom").
 * @param licencee - (Optional) Licencee filter to restrict results.
 * @param customStartDate - (Optional) Custom start date for Custom time period.
 * @param customEndDate - (Optional) Custom end date for Custom time period.
 * @returns Promise resolving to aggregated results sorted by performance.
 */
export async function getTopPerformingMetrics(
  activeTab: TopPerformingTab,
  timePeriod: TimePeriod,
  licencee?: string,
  customStartDate?: Date,
  customEndDate?: Date
) {
  const filter: QueryFilter = {};

  // Align date filtering with gaming-day logic used by location aggregation,
  // machines detail, etc. For "All Time" we deliberately skip the date filter.
  if (timePeriod !== 'All Time') {
    // Use gaming day range calculation for all periods (including Custom)
    // This ensures consistent gaming day offset logic across the application
    const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
      timePeriod,
      8, // Default gaming day start hour (8 AM Trinidad time)
      customStartDate, // Required for Custom period
      customEndDate // Required for Custom period
    );
    filter.readAt = { $gte: rangeStart, $lte: rangeEnd };
  }

  const aggregationQuery =
    activeTab === 'Cabinets'
      ? aggregateMetersForTop5Machines(filter, licencee)
      : aggregateMetersForTop5Locations(filter, licencee);

  const result: Record<string, unknown>[] = [];
  const cursor = Meters.aggregate(aggregationQuery).cursor({ batchSize: 1000 });
  for await (const doc of cursor) {
    result.push(doc);
  }
  return result;
}

/**
 * Aggregates meters for the top 5 performing locations.
 *
 * @param filter - MongoDB filter object for date range.
 * @param licencee - (Optional) Licencee filter to restrict results.
 * @returns MongoDB aggregation pipeline for top 5 locations.
 */
function aggregateMetersForTop5Locations(
  filter: QueryFilter,
  licencee?: string
): PipelineStage[] {
  return [
    { $match: filter },
    {
      $group: {
        _id: '$location',
        totalDrop: { $sum: '$movement.drop' },
        totalGamesPlayed: { $sum: '$movement.gamesPlayed' },
        totalJackpot: { $sum: '$movement.jackpot' },
      },
    },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: '_id',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: '$locationDetails' },
    // Filter by licencee if specified
    ...(licencee
      ? [
        {
          $match: {
            $or: [
              { 'locationDetails.rel.licencee': licencee  }, { 'locationDetails.rel.licencee': licencee  },
            ],
          },
        },
      ]
      : []),
    {
      $project: {
        _id: 0,
        name: '$locationDetails.name',
        locationId: { $toString: '$locationDetails._id' },
        totalDrop: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    { $sort: { totalDrop: -1 } },
    {
      $group: {
        _id: '$locationId',
        name: { $first: '$name' },
        totalDrop: { $sum: '$totalDrop' },
        totalGamesPlayed: { $sum: '$totalGamesPlayed' },
        totalJackpot: { $sum: '$totalJackpot' },
      },
    },
    {
      $project: {
        _id: 0,
        name: 1,
        locationId: '$_id',
        totalDrop: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    { $sort: { totalDrop: -1 } },
    { $limit: 5 },
  ];
}

/**
 * Aggregates meters for the top 5 performing machines.
 *
 * @param filter - MongoDB filter object for date range.
 * @param licencee - (Optional) Licencee filter to restrict results.
 * @returns MongoDB aggregation pipeline for top 5 machines.
 */
function aggregateMetersForTop5Machines(
  filter: QueryFilter,
  licencee?: string
): PipelineStage[] {
  return [
    { $match: filter },
    {
      $group: {
        _id: { machine: '$machine', location: '$location' },
        totalCoinIn: { $sum: '$movement.coinIn' },
        totalCoinOut: { $sum: '$movement.coinOut' },
        totalDrop: { $sum: '$movement.drop' },
        totalCancelledCredits: { $sum: '$movement.totalCancelledCredits' },
        totalGamesPlayed: { $sum: '$movement.gamesPlayed' },
        totalJackpot: { $sum: '$movement.jackpot' },
      },
    },
    {
      $lookup: {
        from: 'machines',
        localField: '_id.machine',
        foreignField: '_id',
        as: 'machineDetails',
      },
    },
    { $unwind: '$machineDetails' },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: '_id.location',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: '$locationDetails' },
    // Filter by licencee if specified
    ...(licencee
      ? [
        {
          $match: {
            $or: [
              { 'locationDetails.rel.licencee': licencee  }, { 'locationDetails.rel.licencee': licencee  },
            ],
          },
        },
      ]
      : []),
    {
      $project: {
        _id: 0,
        name: '$machineDetails.serialNumber',
        customName: '$machineDetails.custom.name',
        assetNumber: '$machineDetails.assetNumber',
        game: '$machineDetails.game',
        location: '$locationDetails.name',
        locationId: { $toString: '$locationDetails._id' },
        machineId: { $toString: '$machineDetails._id' },
        totalCoinIn: 1,
        totalCoinOut: 1,
        totalDrop: 1,
        totalCancelledCredits: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    { $sort: { name: 1, totalDrop: -1 } },
    {
      $group: {
        _id: '$name',
        machine: { $first: '$name' },
        customName: { $first: '$customName' },
        assetNumber: { $first: '$assetNumber' },
        game: { $first: '$game' },
        location: { $first: '$location' },
        locationId: { $first: '$locationId' },
        machineId: { $first: '$machineId' },
        totalCoinIn: { $first: '$totalCoinIn' },
        totalCoinOut: { $first: '$totalCoinOut' },
        totalDrop: { $first: '$totalDrop' },
        totalCancelledCredits: { $first: '$totalCancelledCredits' },
        totalGamesPlayed: { $first: '$totalGamesPlayed' },
        totalJackpot: { $first: '$totalJackpot' },
      },
    },
    {
      $project: {
        _id: 0,
        name: '$machine',
        customName: 1,
        assetNumber: 1,
        game: 1,
        location: '$location',
        locationId: 1,
        machineId: 1,
        totalCoinIn: 1,
        totalCoinOut: 1,
        totalDrop: 1,
        totalCancelledCredits: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    { $sort: { totalDrop: -1 } },
    { $limit: 5 },
  ];
}
