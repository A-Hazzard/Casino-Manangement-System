import { Machine } from "@/app/api/lib/models/machines";

/**
 * Get top performing locations for a given licensee
 */
export async function getTopLocations(licensee: string, startDate?: Date, endDate?: Date) {
  // First get all locations for the licensee
  const locations = await Machine.aggregate([
    {
      $lookup: {
        from: "gaminglocations",
        localField: "gamingLocation",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    {
      $unwind: "$locationDetails",
    },
    {
      $match: {
        "locationDetails.rel.licencee": licensee,
      },
    },
    {
      $group: {
        _id: "$gamingLocation",
        locationInfo: { $first: "$locationDetails" },
        machineCount: { $sum: 1 },
        onlineMachines: {
          $sum: {
            $cond: [{ $eq: ["$assetStatus", "active"] }, 1, 0],
          },
        },
        sasMachines: {
          $sum: {
            $cond: ["$isSasMachine", 1, 0],
          },
        },
      },
    },
  ]);

  // Now get financial metrics for each location using meters collection
  const topLocationsWithMetrics = await Promise.all(
    locations.map(async (location) => {
      const locationId = location._id.toString();
      
      // Get financial metrics from meters collection with date filtering
      const matchStage: Record<string, unknown> = {
        location: locationId,
      };
      
      // Add date filtering if provided
      if (startDate && endDate) {
        matchStage.readAt = { $gte: startDate, $lte: endDate };
      }
      
      const metersAggregation = await Machine.db?.db?.collection("meters")?.aggregate([
        {
          $match: matchStage,
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
      ])?.toArray() || [];

      const financialMetrics = metersAggregation[0] || { totalDrop: 0, totalCancelledCredits: 0 };
      const gross = financialMetrics.totalDrop - financialMetrics.totalCancelledCredits;

      return {
        id: locationId,
        name: location.locationInfo.name,
        totalDrop: financialMetrics.totalDrop,
        cancelledCredits: financialMetrics.totalCancelledCredits,
        gross: gross,
        machineCount: location.machineCount,
        onlineMachines: location.onlineMachines,
        sasMachines: location.sasMachines,
        coordinates: location.locationInfo.geoCoords?.latitude && location.locationInfo.geoCoords?.longitude
          ? [location.locationInfo.geoCoords.longitude, location.locationInfo.geoCoords.latitude]
          : null,
        trend: gross >= 10000 ? "up" : "down",
        trendPercentage: Math.abs(Math.random() * 10),
      };
    })
  );

  // Sort by gross and return top 5
  return topLocationsWithMetrics
    .sort((a, b) => b.gross - a.gross)
    .slice(0, 5);
}

/**
 * Get machine statistics for a given licensee
 */
export async function getMachineStats(licensee: string) {
  const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);
  const matchStage =
    licensee && licensee.toLowerCase() !== "all"
      ? { "locationDetails.rel.licencee": licensee }
      : {};

  const statsPipeline = [
    {
      $lookup: {
        from: "gaminglocations",
        localField: "gamingLocation",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    {
      $unwind: "$locationDetails",
    },
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: null,
        totalMachines: { $sum: 1 },
        onlineMachines: {
          $sum: {
            $cond: [{ $gt: ["$lastActivity", onlineThreshold] }, 1, 0],
          },
        },
        sasMachines: {
          $sum: {
            $cond: ["$isSasMachine", 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ];

  const statsResult = await Machine.aggregate(statsPipeline);
  const machineStats = statsResult[0] || {
    totalMachines: 0,
    onlineMachines: 0,
    sasMachines: 0,
  };

  // Get financial metrics from meters collection for the licensee
  const financialMetrics = await Machine.db?.db?.collection("meters")?.aggregate([
    {
      $lookup: {
        from: "machines",
        localField: "machine",
        foreignField: "_id",
        as: "machineInfo",
      },
    },
    {
      $unwind: "$machineInfo",
    },
    {
      $lookup: {
        from: "gaminglocations",
        localField: "machineInfo.gamingLocation",
        foreignField: "_id",
        as: "locationInfo",
      },
    },
    {
      $unwind: "$locationInfo",
    },
    {
      $match: {
        "locationInfo.rel.licencee": licensee,
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
  ])?.toArray() || [];

  const financial = financialMetrics[0] || { totalDrop: 0, totalCancelledCredits: 0 };
  const totalGross = financial.totalDrop - financial.totalCancelledCredits;

  return {
    ...machineStats,
    totalDrop: financial.totalDrop,
    totalCancelledCredits: financial.totalCancelledCredits,
    totalGross: totalGross,
  };
}
