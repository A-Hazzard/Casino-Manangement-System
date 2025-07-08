import { PipelineStage } from "mongoose";
import { Machine } from "@/app/api/lib/models/machines";

/**
 * Get top performing locations for a given licensee
 */
export async function getTopLocations(licensee: string) {
  const locationsPipeline: PipelineStage[] = [
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
        totalDrop: { $sum: { $ifNull: ["$sasMeters.coinIn", 0] } },
        cancelledCredits: { $sum: { $ifNull: ["$sasMeters.totalCancelledCredits", 0] } },
        gross: {
          $sum: {
            $subtract: [
              { $ifNull: ["$sasMeters.coinIn", 0] },
              {
                $add: [
                  { $ifNull: ["$sasMeters.coinOut", 0] },
                  { $ifNull: ["$sasMeters.jackpot", 0] },
                ],
              },
            ],
          },
        },
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
        locationInfo: { $first: "$locationDetails" },
      },
    },
    { $sort: { gross: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        id: "$_id",
        name: "$locationInfo.name",
        totalDrop: "$totalDrop",
        cancelledCredits: "$cancelledCredits",
        gross: "$gross",
        machineCount: "$machineCount",
        onlineMachines: "$onlineMachines",
        sasMachines: "$sasMachines",
        coordinates: {
          $cond: {
            if: {
              $and: [
                { $ifNull: ["$locationInfo.geoCoords.latitude", false] },
                { $ifNull: ["$locationInfo.geoCoords.longitude", false] },
              ],
            },
            then: [
              "$locationInfo.geoCoords.longitude",
              "$locationInfo.geoCoords.latitude",
            ],
            else: null,
          },
        },
        trend: { $cond: [{ $gte: ["$gross", 10000] }, "up", "down"] },
        trendPercentage: { $abs: { $multiply: [{ $rand: {} }, 10] } },
      },
    },
  ];

  const topLocations = await Machine.aggregate(locationsPipeline);
  return topLocations;
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
        totalDrop: { $sum: { $ifNull: ["$sasMeters.coinIn", 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ["$sasMeters.totalCancelledCredits", 0] },
        },
        totalGross: {
          $sum: {
            $subtract: [
              { $ifNull: ["$sasMeters.coinIn", 0] },
              {
                $add: [
                  { $ifNull: ["$sasMeters.coinOut", 0] },
                  { $ifNull: ["$sasMeters.jackpot", 0] },
                ],
              },
            ],
          },
        },
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
  return statsResult[0] || {
    totalDrop: 0,
    totalCancelledCredits: 0,
    totalGross: 0,
    totalMachines: 0,
    onlineMachines: 0,
    sasMachines: 0,
  };
} 