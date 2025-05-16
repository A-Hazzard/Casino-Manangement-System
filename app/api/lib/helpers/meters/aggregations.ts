import { Db } from "mongodb";
import { PipelineStage } from "mongoose";
import { CustomDate, QueryFilter } from "../../types";

/**
 * Returns meter field projections based on whether account denominations are used.
 *
 * @param useAccountDenom - Boolean flag indicating whether to use account denominations.
 * @returns MongoDB projection object.
 */
function getMeterFieldProjections(useAccountDenom: boolean) {
  const meterFieldProjectionsWithAccountDenom = {
    drop: "$_totalDrop",
    totalCancelledCredits: "$_totalCancelledCredits",
    gross: {
      $subtract: [
        {
          $subtract: [
            { $ifNull: ["$_totalDrop", 0] },
            { $ifNull: ["$_totalJackpot", 0] },
          ],
        },
        { $ifNull: ["$_totalCancelledCredits", 0] },
      ],
    },
    gamesPlayed: "$totalGamesPlayed",
    jackpot: "$_totalJackpot",
  };

  const meterFieldProjectionsWithoutAccountDenom = {
    drop: "$totalDrop",
    totalCancelledCredits: "$totalCancelledCredits",
    gross: {
      $subtract: [
        {
          $subtract: [
            { $ifNull: ["$totalDrop", 0] },
            { $ifNull: ["$totalJackpot", 0] },
          ],
        },
        { $ifNull: ["$totalCancelledCredits", 0] },
      ],
    },
    gamesPlayed: "$totalGamesPlayed",
    jackpot: "$totalJackpot",
  };

  return useAccountDenom
    ? meterFieldProjectionsWithAccountDenom
    : meterFieldProjectionsWithoutAccountDenom;
}

/**
 * Aggregates meters without considering location sessions.
 *
 * @param filter - MongoDB filter object for selecting meter records.
 * @returns MongoDB aggregation pipeline array.
 */
export function aggregateMetersWithoutLocationSession(
  filter: QueryFilter
): PipelineStage[] {
  return [
    { $match: filter },
    {
      $addFields: {
        day: { $dateToString: { date: "$readAt", format: "%Y-%m-%d" } },
        time: { $dateToString: { date: "$readAt", format: "%H:%M" } },
      },
    },
    {
      $lookup: {
        from: "gaminglocations",
        localField: "location",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    {
      $unwind: {
        path: "$locationDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Grouping by machine, location, day, and time.
    {
      $group: {
        _id: {
          machine: "$machine",
          location: "$location",
          day: "$day",
          time: "$time",
        },
        movementDrop: { $sum: "$movement.drop" },
        movementTotalCancelledCredits: {
          $sum: "$movement.totalCancelledCredits",
        },
        movementJackpot: { $sum: "$movement.jackpot" },
        movementGamesPlayed: { $sum: "$movement.gamesPlayed" },
        viewingAccountDenomination: { $first: "$viewingAccountDenomination" },
        geoCoords: { $first: "$locationDetails.geoCoords" },
      },
    },
    {
      $project: {
        machine: "$_id.machine",
        location: "$_id.location",
        day: "$_id.day",
        time: "$_id.time",
        movementDrop: 1,
        movementJackpot: 1,
        movementTotalCancelledCredits: 1,
        movementGamesPlayed: 1,
        geoCoords: 1,
        viewingAccountDenomination: 1,
        _viewingAccountDenomination: {
          movementDrop: {
            $ceil: {
              $divide: [
                "$movementDrop",
                { $ifNull: ["$viewingAccountDenomination.drop", 1] },
              ],
            },
          },
          movementTotalCancelledCredits: {
            $ceil: {
              $divide: [
                "$movementTotalCancelledCredits",
                {
                  $ifNull: [
                    "$viewingAccountDenomination.totalCancelledCredits",
                    1,
                  ],
                },
              ],
            },
          },
          movementJackpot: {
            $ceil: {
              $divide: [
                "$movementJackpot",
                { $ifNull: ["$viewingAccountDenomination.jackpot", 1] },
              ],
            },
          },
        },
      },
    },
    {
      $sort: { day: 1, time: 1 },
    },
  ];
}

/**
 * Creates an aggregation pipeline for grouping metrics by location, day, and time.
 *
 * @param useAccountDenom - Boolean flag indicating whether to use account denominations.
 * @returns MongoDB aggregation pipeline array.
 */
function aggregateByLocationsStages(useAccountDenom: boolean): PipelineStage[] {
  return [
    {
      $group: {
        _id: { location: "$location", day: "$day", time: "$time" },
        totalDrop: { $sum: "$movementDrop" },
        _totalDrop: { $sum: "$_viewingAccountDenomination.movementDrop" },
        totalCancelledCredits: { $sum: "$movementTotalCancelledCredits" },
        _totalCancelledCredits: {
          $sum: "$_viewingAccountDenomination.movementTotalCancelledCredits",
        },
        _totalJackpot: { $sum: "$_viewingAccountDenomination.movementJackpot" },
        geoCoords: { $push: "$geoCoords" },
      },
    },
    {
      $project: {
        _id: 0,
        location: "$_id.location",
        day: "$_id.day",
        time: "$_id.time",
        geoCoords: "$geoCoords",
        ...getMeterFieldProjections(useAccountDenom),
      },
    },
  ];
}

/**
 * Entry Point for Aggregations. Aggregates metrics for locations over a given timeframe.
 *
 * When a licencee filter is provided, a match stage is inserted after the $unwind stage
 * to filter gaming locations by licencee, while still grouping by { location, day, time }.
 *
 * @param db - The MongoDB database instance.
 * @param timeframe - The timeframe filter (startDate and endDate).
 * @param useAccountDenom - Boolean flag to use account denominations.
 * @param licencee - (Optional) Licencee ID to filter gaming locations.
 * @returns Promise resolving to an array of aggregated trend data.
 */
export async function getMetricsForLocations(
  db: Db,
  timeframe: CustomDate,
  useAccountDenom = false,
  licencee?: string
) {
  if (!timeframe.startDate || !timeframe.endDate) {
    throw new Error("Provide Timeframe for Both Start & End Date ⌛");
  }

  const filter: QueryFilter = {
    readAt: { $gte: timeframe.startDate, $lte: timeframe.endDate },
  };

  const metersStageAggregationQuery =
    aggregateMetersWithoutLocationSession(filter);

  if (licencee) {
    // Insert the licencee filter after $unwind stage (index 4)
    metersStageAggregationQuery.splice(4, 0, {
      $match: { "locationDetails.rel.licencee": licencee },
    });
  }

  const locationStageAggregationQuery =
    aggregateByLocationsStages(useAccountDenom);

  return db
    .collection("meters")
    .aggregate(
      metersStageAggregationQuery.concat(locationStageAggregationQuery),
      {
        allowDiskUse: true,
      }
    )
    .toArray();
}
