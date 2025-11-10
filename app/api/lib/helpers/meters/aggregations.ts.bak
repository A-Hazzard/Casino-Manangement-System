import { Db } from 'mongodb';
import { PipelineStage } from 'mongoose';
import { CustomDate, QueryFilter } from '../../types';

/**
 * Returns meter field projections based on whether account denominations are used.
 *
 * @param useAccountDenom - Boolean flag indicating whether to use account denominations.
 * @returns MongoDB projection object.
 */
function getMeterFieldProjections(useAccountDenom: boolean) {
  const meterFieldProjectionsWithAccountDenom = {
    drop: '$_totalDrop',
    totalCancelledCredits: '$_totalCancelledCredits',
    gross: {
      $subtract: [
        {
          $subtract: [
            { $ifNull: ['$_totalDrop', 0] },
            { $ifNull: ['$_totalJackpot', 0] },
          ],
        },
        { $ifNull: ['$_totalCancelledCredits', 0] },
      ],
    },
    gamesPlayed: '$totalGamesPlayed',
    jackpot: '$_totalJackpot',
  };

  const meterFieldProjectionsWithoutAccountDenom = {
    drop: '$totalDrop',
    totalCancelledCredits: '$totalCancelledCredits',
    gross: {
      $subtract: [
        {
          $subtract: [
            { $ifNull: ['$totalDrop', 0] },
            { $ifNull: ['$totalJackpot', 0] },
          ],
        },
        { $ifNull: ['$totalCancelledCredits', 0] },
      ],
    },
    gamesPlayed: '$totalGamesPlayed',
    jackpot: '$totalJackpot',
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
    // Stage 1: Filter meter records based on provided criteria (date range, location, etc.)
    { $match: filter },

    // Stage 2: Add computed date/time fields for grouping and sorting
    {
      $addFields: {
        day: { $dateToString: { date: '$readAt', format: '%Y-%m-%d' } },
        time: { $dateToString: { date: '$readAt', format: '%H:%M' } },
      },
    },

    // Stage 3: Join with gaming locations to get location details and licensee info
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },

    // Stage 4: Flatten the location details array (each meter now has location info)
    {
      $unwind: {
        path: '$locationDetails',
        preserveNullAndEmptyArrays: true,
      },
    },

    // Stage 5: Group by day and time to aggregate meter movements
    {
      $group: {
        _id: {
          day: '$day',
          time: '$time',
        },
        movementDrop: { $sum: '$movement.drop' },
        movementTotalCancelledCredits: {
          $sum: '$movement.totalCancelledCredits',
        },
        movementJackpot: { $sum: '$movement.jackpot' },
        movementGamesPlayed: { $sum: '$movement.gamesPlayed' },
        viewingAccountDenomination: { $first: '$viewingAccountDenomination' },
        // Keep location info for display purposes
        location: { $first: '$location' },
        geoCoords: { $first: '$locationDetails.geoCoords' },
      },
    },
    // Stage 6: Project and transform fields for final output
    {
      $project: {
        day: '$_id.day',
        time: '$_id.time', // Include actual time from grouping
        location: '$location',
        movementDrop: 1,
        movementJackpot: 1,
        movementTotalCancelledCredits: 1,
        movementGamesPlayed: 1,
        geoCoords: 1,
        viewingAccountDenomination: 1,
        // Calculate account denomination conversions for display
        _viewingAccountDenomination: {
          movementDrop: {
            $ceil: {
              $divide: [
                '$movementDrop',
                { $ifNull: ['$viewingAccountDenomination.drop', 1] },
              ],
            },
          },
          movementTotalCancelledCredits: {
            $ceil: {
              $divide: [
                '$movementTotalCancelledCredits',
                {
                  $ifNull: [
                    '$viewingAccountDenomination.totalCancelledCredits',
                    1,
                  ],
                },
              ],
            },
          },
          movementJackpot: {
            $ceil: {
              $divide: [
                '$movementJackpot',
                { $ifNull: ['$viewingAccountDenomination.jackpot', 1] },
              ],
            },
          },
        },
      },
    },

    // Stage 7: Sort results by day and time for chronological order
    {
      $sort: { day: 1, time: 1 },
    },
  ];
}

/**
 * Creates a simplified aggregation pipeline that matches the totals API logic.
 * This groups by day only (not by location and time) to ensure chart data matches totals.
 *
 * @param useAccountDenom - Boolean flag indicating whether to use account denominations.
 * @returns MongoDB aggregation pipeline array.
 */
function aggregateByDayOnlyStages(useAccountDenom: boolean): PipelineStage[] {
  return [
    // Stage 1: Group by day only (not by time) for daily aggregation
    {
      $group: {
        _id: { day: '$day' },
        totalDrop: { $sum: '$movementDrop' },
        _totalDrop: { $sum: '$_viewingAccountDenomination.movementDrop' },
        totalCancelledCredits: { $sum: '$movementTotalCancelledCredits' },
        _totalCancelledCredits: {
          $sum: '$_viewingAccountDenomination.movementTotalCancelledCredits',
        },
        _totalJackpot: { $sum: '$_viewingAccountDenomination.movementJackpot' },
        // Keep the first location and geoCoords for display purposes
        location: { $first: '$location' },
        geoCoords: { $first: '$geoCoords' },
      },
    },

    // Stage 2: Project final fields with proper meter calculations
    {
      $project: {
        _id: 0,
        location: '$location',
        day: '$_id.day',
        time: '00:00', // Default time for daily aggregation
        geoCoords: '$geoCoords',
        ...getMeterFieldProjections(useAccountDenom),
      },
    },
  ];
}

/**
 * Creates an aggregation pipeline that groups by day and time for hourly charts.
 * This is used for single-day custom ranges to show hourly breakdown.
 *
 * @param useAccountDenom - Boolean flag indicating whether to use account denominations.
 * @returns MongoDB aggregation pipeline array.
 */
function aggregateByDayAndTimeStages(
  useAccountDenom: boolean
): PipelineStage[] {
  return [
    // Stage 1: Group by both day and time for hourly aggregation
    {
      $group: {
        _id: { day: '$day', time: '$time' },
        totalDrop: { $sum: '$movementDrop' },
        _totalDrop: { $sum: '$_viewingAccountDenomination.movementDrop' },
        totalCancelledCredits: { $sum: '$movementTotalCancelledCredits' },
        _totalCancelledCredits: {
          $sum: '$_viewingAccountDenomination.movementTotalCancelledCredits',
        },
        _totalJackpot: { $sum: '$_viewingAccountDenomination.movementJackpot' },
        // Keep the first location and geoCoords for display purposes
        location: { $first: '$location' },
        geoCoords: { $first: '$geoCoords' },
      },
    },

    // Stage 2: Project final fields with hourly time data
    {
      $project: {
        _id: 0,
        location: '$location',
        day: '$_id.day',
        time: '$_id.time', // Include actual time for hourly aggregation
        geoCoords: '$geoCoords',
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
  licencee?: string,
  timePeriod?: string
) {
  // Handle "All Time" case where timeframe is undefined
  const filter: QueryFilter = {};

  if (timeframe.startDate && timeframe.endDate) {
    filter.readAt = { $gte: timeframe.startDate, $lte: timeframe.endDate };
  }

  const metersStageAggregationQuery =
    aggregateMetersWithoutLocationSession(filter);

  if (licencee) {
    // Insert the licencee filter after $unwind stage (index 4)
    metersStageAggregationQuery.splice(4, 0, {
      $match: { 'locationDetails.rel.licencee': licencee },
    });
  }

  // Determine if we should use hourly or daily aggregation
  let shouldUseHourlyAggregation = false;

  if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
    shouldUseHourlyAggregation = true;
  } else if (
    timePeriod === 'Custom' &&
    timeframe.startDate &&
    timeframe.endDate
  ) {
    // For custom ranges, check if it spans only one day
    const diffInMs =
      timeframe.endDate.getTime() - timeframe.startDate.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    shouldUseHourlyAggregation = diffInDays <= 1;
  }

  // Choose the appropriate aggregation pipeline
  const locationStageAggregationQuery = shouldUseHourlyAggregation
    ? aggregateByDayAndTimeStages(useAccountDenom)
    : aggregateByDayOnlyStages(useAccountDenom);

  return db
    .collection('meters')
    .aggregate(
      metersStageAggregationQuery.concat(locationStageAggregationQuery),
      {
        allowDiskUse: true,
      }
    )
    .toArray();
}
