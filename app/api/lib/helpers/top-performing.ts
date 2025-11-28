import { Db } from 'mongodb';
import { getDatesForTimePeriod } from '../utils/dates';
import {
  PipelineStage,
  QueryFilter,
  TimePeriod,
  CustomDate,
} from '@/lib/types/api';

type ActiveTab = 'locations' | 'Cabinets';

/**
 * Fetches the top 5 performing locations or Cabinets based on total moneyIn (drop).
 *
 * @param db - MongoDB database instance.
 * @param activeTab - The current tab the user is on ("locations" or "Cabinets").
 * @param timePeriod - The time range (e.g., "7d", "30d").
 * @param licensee - (Optional) Licensee filter to restrict results.
 * @returns Promise resolving to aggregated results sorted by performance.
 */
export async function getTopPerformingMetrics(
  db: Db,
  activeTab: ActiveTab,
  timePeriod: TimePeriod,
  licensee?: string
) {
  const { startDate, endDate }: CustomDate = getDatesForTimePeriod(timePeriod);

  const filter: QueryFilter = {};

  // Only add date filter if we have valid dates (not "All Time")
  if (startDate && endDate) {
    filter.readAt = { $gte: startDate, $lte: endDate };
  }

  const aggregationQuery =
    activeTab === 'Cabinets'
      ? aggregateMetersForTop5Machines(filter, licensee)
      : aggregateMetersForTop5Locations(filter, licensee);

  return db.collection('meters').aggregate(aggregationQuery).toArray();
}

/**
 * Aggregates meters for the top 5 performing locations.
 *
 * @param filter - MongoDB filter object for date range.
 * @param licensee - (Optional) Licensee filter to restrict results.
 * @returns MongoDB aggregation pipeline for top 5 locations.
 */
function aggregateMetersForTop5Locations(filter: QueryFilter, licensee?: string): PipelineStage[] {
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
    // Filter by licensee if specified
    ...(licensee ? [{
      $match: {
        'locationDetails.rel.licencee': licensee
      }
    }] : []),
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
 * @param licensee - (Optional) Licensee filter to restrict results.
 * @returns MongoDB aggregation pipeline for top 5 machines.
 */
function aggregateMetersForTop5Machines(filter: QueryFilter, licensee?: string): PipelineStage[] {
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
    // Filter by licensee if specified
    ...(licensee ? [{
      $match: {
        'locationDetails.rel.licencee': licensee
      }
    }] : []),
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
