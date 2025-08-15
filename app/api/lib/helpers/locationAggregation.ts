import { Db, Filter, Document, ObjectId } from "mongodb";
import {
  AggregatedLocation,
  LocationDateRange,
  LocationFilter,
  GamingLocation,
} from "@/lib/types/location";

/**
 * Aggregates and returns location metrics, including machine counts and online status, with optional filters.
 * Optimized for performance with reduced data processing and parallel execution.
 *
 * @param db - MongoDB database instance.
 * @param startDate - Start date for aggregation.
 * @param endDate - End date for aggregation.
 * @param includeAllLocations - Whether to include all locations or only those with metrics.
 * @param licencee - (Optional) Licencee filter for locations.
 * @param machineTypeFilter - (Optional) Machine type filter.
 * @returns Promise resolving to an array of AggregatedLocation objects.
 */
export const getLocationsWithMetrics = async (
  db: Db,
  { startDate, endDate }: LocationDateRange,
  includeAllLocations = true,
  licencee?: string,
  machineTypeFilter?: LocationFilter,
  page: number = 1,
  limit: number = 50
): Promise<{ rows: AggregatedLocation[]; totalCount: number }> => {
  const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);

  // If a licencee is provided, prefetch location ids to constrain downstream queries
  let licenseeLocationIds: ObjectId[] | null = null;
  if (licencee) {
    const locs = await db
      .collection("gaminglocations")
      .find(
        {
          deletedAt: { $in: [null, new Date(-1)] },
          "rel.licencee": licencee,
        },
        {
          projection: { _id: 1 },
          // Add limit for performance
          limit: 1000,
        }
      )
      .toArray();
    licenseeLocationIds = locs.map((l: any) => l._id as ObjectId);
  }

  // Use the correct approach: lookup from locations to meters (like your MongoDB query)
  const locationPipeline: Document[] = [
    {
      $match: {
        deletedAt: { $in: [null, new Date(-1)] },
        ...(licenseeLocationIds && licenseeLocationIds.length > 0
          ? { _id: { $in: licenseeLocationIds } }
          : {}),
      },
    },
    {
      $lookup: {
        from: "meters",
        let: { locationId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$location", "$$locationId"] },
              ...(startDate && endDate
                ? {
                    createdAt: {
                      $gte: startDate,
                      $lte: endDate,
                    },
                  }
                : {}),
            },
          },
          {
            $group: {
              _id: null,
              totalDrop: { $sum: { $ifNull: ["$movement.drop", 0] } },
              totalCancelledCredits: {
                $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] },
              },
            },
          },
        ],
        as: "metersData",
      },
    },
    {
      $addFields: {
        moneyIn: {
          $ifNull: [{ $arrayElemAt: ["$metersData.totalDrop", 0] }, 0],
        },
        moneyOut: {
          $ifNull: [
            { $arrayElemAt: ["$metersData.totalCancelledCredits", 0] },
            0,
          ],
        },
        location: { $toString: "$_id" },
      },
    },
  ];

  // Execute the location-based aggregation with machine lookup
  const locationsWithMetrics = await db
    .collection("gaminglocations")
    .aggregate(
      [
        ...locationPipeline,
        // Add machine lookup to the same pipeline
        {
          $lookup: {
            from: "machines",
            let: { locationId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$gamingLocation", "$$locationId"] },
                  deletedAt: { $in: [null, new Date(-1)] },
                },
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  online: {
                    $sum: {
                      $cond: [
                        { $gte: ["$lastActivity", onlineThreshold] },
                        1,
                        0,
                      ],
                    },
                  },
                  sasMachines: { $sum: { $cond: ["$isSasMachine", 1, 0] } },
                  nonSasMachines: {
                    $sum: { $cond: [{ $eq: ["$isSasMachine", false] }, 1, 0] },
                  },
                },
              },
            ],
            as: "machineData",
          },
        },
        {
          $addFields: {
            totalMachines: {
              $ifNull: [{ $arrayElemAt: ["$machineData.total", 0] }, 0],
            },
            onlineMachines: {
              $ifNull: [{ $arrayElemAt: ["$machineData.online", 0] }, 0],
            },
            sasMachines: {
              $ifNull: [{ $arrayElemAt: ["$machineData.sasMachines", 0] }, 0],
            },
            nonSasMachines: {
              $ifNull: [
                { $arrayElemAt: ["$machineData.nonSasMachines", 0] },
                0,
              ],
            },
            gross: { $subtract: ["$moneyIn", "$moneyOut"] },
          },
        },
      ],
      {
        allowDiskUse: true,
        maxTimeMS: 20000,
      }
    )
    .toArray();

  // Transform the aggregated data to the expected format
  const enhancedMetrics = locationsWithMetrics.map((location) => {
    const locationId = location._id.toString();

    // Calculate metrics with proper fallbacks
    const moneyIn = location.moneyIn || 0;
    const moneyOut = location.moneyOut || 0;
    const gross = location.gross || moneyIn - moneyOut;

    // Machine counts with proper fallbacks
    const totalMachines = location.totalMachines || 0;
    const onlineMachines = location.onlineMachines || 0;
    const sasMachines = location.sasMachines || 0;
    const nonSasMachines = location.nonSasMachines || 0;

    // Determine if location has SAS machines
    const hasSasMachines = sasMachines > 0;
    const hasNonSasMachines = nonSasMachines > 0;

    return {
      location: locationId,
      locationName: location.name || "Unknown Location",
      moneyIn,
      moneyOut,
      gross,
      totalMachines,
      onlineMachines,
      sasMachines,
      nonSasMachines,
      hasSasMachines,
      hasNonSasMachines,
      isLocalServer: location.isLocalServer || false,
      // For backward compatibility
      noSMIBLocation: !hasSasMachines,
      hasSmib: hasSasMachines,
    } as AggregatedLocation;
  });

  const allResults = enhancedMetrics;

  // Apply pagination
  const totalCount = allResults.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedResults = allResults.slice(startIndex, endIndex);

  return {
    rows: paginatedResults,
    totalCount,
  };
};
