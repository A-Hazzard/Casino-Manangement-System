/**
 * Top Performing Metrics Helper Functions
 *
 * Provides helper functions for fetching top-performing locations or machines (Cabinets)
 * based on total moneyIn (drop). It uses MongoDB aggregation pipelines to calculate
 * performance metrics and return the top 5 performers.
 *
 * Features:
 * - Fetches top 5 performing locations or machines based on total drop.
 * - Supports time period filtering (7d, 30d, etc.).
 * - Uses MongoDB aggregation pipelines for efficient data processing.
 * - Includes location and machine details via lookups.
 */

import { Db } from 'mongodb';
import { getDatesForTimePeriod } from '../utils/dates';
import {
  PipelineStage,
  QueryFilter,
  TimePeriod,
  CustomDate,
} from '@/lib/types/api';

// ============================================================================
// Type Definitions
// ============================================================================

type ActiveTab = 'locations' | 'Cabinets';

// ============================================================================
// Top Performing Metrics Fetching
// ============================================================================

/**
 * Fetches the top 5 performing locations or Cabinets based on total moneyIn (drop).
 *
 * @param db - MongoDB database instance.
 * @param activeTab - The current tab the user is on ("locations" or "Cabinets").
 * @param timePeriod - The time range (e.g., "7d", "30d").
 * @returns Promise resolving to aggregated results sorted by performance.
 */
export async function getTopPerformingMetrics(
  db: Db,
  activeTab: ActiveTab,
  timePeriod: TimePeriod
) {
  const { startDate, endDate }: CustomDate = getDatesForTimePeriod(timePeriod);

  const filter: QueryFilter = {};

  // Only add date filter if we have valid dates (not "All Time")
  if (startDate && endDate) {
    filter.readAt = { $gte: startDate, $lte: endDate };
  }

  const aggregationQuery =
    activeTab === 'Cabinets'
      ? aggregateMetersForTop5Machines(filter)
      : aggregateMetersForTop5Locations(filter);

  return db.collection('meters').aggregate(aggregationQuery).toArray();
}

// ============================================================================
// Aggregation Pipeline Builders
// ============================================================================

/**
 * Aggregates meters for the top 5 performing locations.
 *
 * @param filter - MongoDB filter object for date range.
 * @returns MongoDB aggregation pipeline for top 5 locations.
 */
function aggregateMetersForTop5Locations(filter: QueryFilter): PipelineStage[] {
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
    {
      $project: {
        _id: 0,
        location: '$locationDetails.name',
        totalDrop: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    { $sort: { location: 1, totalDrop: -1 } },
    {
      $group: {
        _id: '$location',
        totalDrop: { $first: '$totalDrop' },
        totalGamesPlayed: { $first: '$totalGamesPlayed' },
        totalJackpot: { $first: '$totalJackpot' },
      },
    },
    {
      $project: {
        _id: 0,
        location: '$_id',
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
 * @returns MongoDB aggregation pipeline for top 5 machines.
 */
function aggregateMetersForTop5Machines(filter: QueryFilter): PipelineStage[] {
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
    {
      $project: {
        _id: 0,
        machine: '$machineDetails.serialNumber',
        location: '$locationDetails.name',
        totalCoinIn: 1,
        totalCoinOut: 1,
        totalDrop: 1,
        totalCancelledCredits: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    { $sort: { location: 1, totalDrop: -1 } },
    {
      $group: {
        _id: '$location',
        machine: { $first: '$machine' },
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
        location: '$_id',
        machine: 1,
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
