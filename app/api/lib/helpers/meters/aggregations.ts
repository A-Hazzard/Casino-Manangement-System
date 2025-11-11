import { Db } from 'mongodb';
import { PipelineStage } from 'mongoose';
import { CustomDate, QueryFilter } from '../../types';

// NOTE: Old helper functions removed - replaced with optimized direct query approach
// Backup available in aggregations.ts.bak if needed for reference

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

// NOTE: Old aggregation functions removed - replaced with optimized direct query approach
// Backup available in aggregations.ts.bak if needed for reference

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
  _useAccountDenom = false,
  licencee?: string,
  timePeriod?: string
) {
  // 🚀 OPTIMIZED: Pre-filter machines by licensee to avoid expensive lookups in aggregation
  let machineIds: string[] | undefined;
  
  if (licencee) {
    // Step 1: Get machines for this licensee's locations (ONE lookup, not per-meter)
    const machinesForLicensee = await db.collection('machines').aggregate([
      {
        $match: {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
      },
      {
        $lookup: {
          from: 'gaminglocations',
          let: { gamingLoc: { $toString: '$gamingLocation' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toString: '$_id' }, '$$gamingLoc'] },
                'rel.licencee': licencee,
              },
            },
          ],
          as: 'location',
        },
      },
      { $match: { location: { $ne: [] } } },
      { $project: { _id: 1 } },
    ]).toArray();
    
    machineIds = machinesForLicensee.map(m => m._id.toString());
    
    // If no machines found for this licensee, return empty array
    if (machineIds.length === 0) {
      return [];
    }
  }

  // Handle "All Time" case where timeframe is undefined
  const filter: Record<string, unknown> = {};

  if (timeframe.startDate && timeframe.endDate) {
    filter.readAt = { $gte: timeframe.startDate, $lte: timeframe.endDate };
  }
  
  // Add machine filter if we have licensee-specific machines
  if (machineIds) {
    filter.machine = { $in: machineIds };
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

  // 🚀 OPTIMIZED: Direct aggregation without expensive lookups
  // For 30d/7d periods, use daily aggregation (respecting gaming day offset)
  // For Today/Yesterday, use hourly aggregation
  const aggregationPipeline: PipelineStage[] = [
    // Stage 1: Filter meters by date and machines
    { $match: filter },
    
    // Stage 2: Add day and time fields
    // NOTE: Gaming day offset is already handled in the filter.readAt range
    // For daily grouping, we extract the date from readAt
    {
      $addFields: {
        day: { $dateToString: { date: '$readAt', format: '%Y-%m-%d', timezone: 'UTC' } },
        time: shouldUseHourlyAggregation 
          ? { $dateToString: { date: '$readAt', format: '%H:%M', timezone: 'UTC' } }
          : '00:00', // For daily aggregation, use placeholder time
      },
    },
  ];

  // Stage 3: Group by day (and time if hourly)
  if (shouldUseHourlyAggregation) {
    aggregationPipeline.push({
      $group: {
        _id: { day: '$day', time: '$time' },
        totalDrop: { $sum: '$movement.drop' },
        totalCancelledCredits: { $sum: '$movement.totalCancelledCredits' },
        totalJackpot: { $sum: '$movement.jackpot' },
      },
    });
  } else {
    aggregationPipeline.push({
      $group: {
        _id: { day: '$day' },
        totalDrop: { $sum: '$movement.drop' },
        totalCancelledCredits: { $sum: '$movement.totalCancelledCredits' },
        totalJackpot: { $sum: '$movement.jackpot' },
      },
    });
  }

  // Stage 4: Project final fields
  aggregationPipeline.push({
    $project: {
      _id: 0,
      day: '$_id.day',
      time: shouldUseHourlyAggregation ? '$_id.time' : '00:00',
      drop: '$totalDrop',
      totalCancelledCredits: '$totalCancelledCredits',
      gross: {
        $subtract: [
          { $subtract: [{ $ifNull: ['$totalDrop', 0] }, { $ifNull: ['$totalJackpot', 0] }] },
          { $ifNull: ['$totalCancelledCredits', 0] },
        ],
      },
      gamesPlayed: { $literal: 0 }, // Not calculated in this optimized version
      jackpot: '$totalJackpot',
    },
  });

  // Stage 5: Sort
  aggregationPipeline.push({ $sort: { day: 1, time: 1 } });

  // 🚀 OPTIMIZATION: Use index hint for better performance on large datasets
  // The compound index (machine + readAt) is optimal for our queries
  const hint = machineIds ? { machine: 1, readAt: 1 } : { readAt: 1 };

  return db
    .collection('meters')
    .aggregate(aggregationPipeline, {
      allowDiskUse: true,
      maxTimeMS: 90000, // Increased to 90 seconds for 30d queries
      hint, // Force MongoDB to use the optimal index
    })
    .toArray();
}
