import { Db } from "mongodb"
import {QueryFilter, CustomDate, TimePeriod} from "../types"
import { getDatesForTimePeriod } from "../utils/dates"
import { ActiveTab } from "@/lib/types"

type PipelineStage = Record<string, unknown>

/**
 * Fetches the top 5 performing locations or Cabinets based on total moneyIn (drop).
 *
 * @param db - MongoDB database instance
 * @param activeTab - The current tab the user is on ("locations" or "Cabinets") N.B Cabinets = Machines
 * @param timePeriod - The time range (e.g., "7d", "30d")
 * @returns Aggregated results sorted by performance
 */
export async function getTopPerformingMetrics(
  db: Db,
  activeTab: ActiveTab,
  timePeriod: TimePeriod
) {
  const { startDate, endDate }: CustomDate = getDatesForTimePeriod(timePeriod)

  const filter: QueryFilter = {
    readAt: { $gte: startDate, $lte: endDate },
  }

  const aggregationQuery =
    activeTab === "Cabinets"
      ? aggregateMetersForTop5Machines(filter)
      : aggregateMetersForTop5Locations(filter)

  return db.collection("meters").aggregate(aggregationQuery).toArray()
}

/**
 * Aggregates meters for the top 5 performing locations.
 *
 * @param filter - MongoDB filter object for date range
 * @returns MongoDB aggregation pipeline
 */
function aggregateMetersForTop5Locations(filter: QueryFilter): PipelineStage[] {
  return [
    { $match: filter },
    {
      $group: {
        _id: "$location",
        totalDrop: { $sum: "$movement.drop" },
        totalGamesPlayed: { $sum: "$movement.gamesPlayed" },
        totalJackpot: { $sum: "$movement.jackpot" },
      },
    },
    {
      $lookup: {
        from: "gaminglocations",
        localField: "_id",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    { $unwind: "$locationDetails" },
    {
      $project: {
        _id: 0,
        location: "$locationDetails.name",
        totalDrop: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    // Sort by location name (to group same names together) and totalDrop descending
    { $sort: { location: 1, totalDrop: -1 } },
    // Group by location name to ensure uniqueness – for each location, pick the record with the highest totalDrop
    {
      $group: {
        _id: "$location",
        totalDrop: { $first: "$totalDrop" },
        totalGamesPlayed: { $first: "$totalGamesPlayed" },
        totalJackpot: { $first: "$totalJackpot" },
      },
    },
    {
      $project: {
        _id: 0,
        location: "$_id",
        totalDrop: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    // Finally, sort by totalDrop descending and limit to 5 results
    { $sort: { totalDrop: -1 } },
    { $limit: 5 },
  ];
}

/**
 * Aggregates meters for the top 5 performing machines.
 *
 * @param filter - MongoDB filter object for date range
 * @returns MongoDB aggregation pipeline
 */
function aggregateMetersForTop5Machines(filter: QueryFilter): PipelineStage[] {
  return [
    { $match: filter },
    {
      $group: {
        _id: { machine: "$machine", location: "$location" },
        totalCoinIn: { $sum: "$movement.coinIn" },
        totalCoinOut: { $sum: "$movement.coinOut" },
        totalDrop: { $sum: "$movement.drop" },
        totalCancelledCredits: { $sum: "$movement.totalCancelledCredits" },
        totalGamesPlayed: { $sum: "$movement.gamesPlayed" },
        totalJackpot: { $sum: "$movement.jackpot" },
      },
    },
    {
      $lookup: {
        from: "machines",
        localField: "_id.machine",
        foreignField: "_id",
        as: "machineDetails",
      },
    },
    { $unwind: "$machineDetails" },
    {
      $lookup: {
        from: "gaminglocations",
        localField: "_id.location",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    { $unwind: "$locationDetails" },
    {
      $project: {
        _id: 0,
        machine: "$machineDetails._id",
        location: "$locationDetails.name",
        totalCoinIn: 1,
        totalCoinOut: 1,
        totalDrop: 1,
        totalCancelledCredits: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    // First, sort by location (to group by) and then by totalDrop descending
    { $sort: { location: 1, totalDrop: -1 } },
    // Group by location to remove duplicates—only the first (highest totalDrop) entry per location is kept
    {
      $group: {
        _id: "$location",
        machine: { $first: "$machine" },
        totalCoinIn: { $first: "$totalCoinIn" },
        totalCoinOut: { $first: "$totalCoinOut" },
        totalDrop: { $first: "$totalDrop" },
        totalCancelledCredits: { $first: "$totalCancelledCredits" },
        totalGamesPlayed: { $first: "$totalGamesPlayed" },
        totalJackpot: { $first: "$totalJackpot" },
      },
    },
    {
      $project: {
        _id: 0,
        location: "$_id",
        machine: 1,
        totalCoinIn: 1,
        totalCoinOut: 1,
        totalDrop: 1,
        totalCancelledCredits: 1,
        totalGamesPlayed: 1,
        totalJackpot: 1,
      },
    },
    // Finally, sort the unique locations by totalDrop descending and limit to 5
    { $sort: { totalDrop: -1 } },
    { $limit: 5 },
  ];
}
