import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import { PipelineStage } from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get("licensee");

    if (!licensee) {
      return NextResponse.json(
        { message: "Licensee is required" },
        { status: 400 }
      );
    }

    const locationsPipeline: PipelineStage[] = [
      // Match machines for the given licensee
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
      // Group by location to aggregate machine data
      {
        $group: {
          _id: "$gamingLocation",
          totalDrop: { $sum: "$sasMeters.drop" },
          cancelledCredits: { $sum: "$sasMeters.totalCancelledCredits" },
          gross: {
            $sum: {
              $subtract: [
                { $ifNull: ["$sasMeters.drop", 0] },
                { $ifNull: ["$sasMeters.totalCancelledCredits", 0] },
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
      // Sort by gross revenue
      { $sort: { gross: -1 } },
      // Limit to top 5
      { $limit: 5 },
      // Project the final structure
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
          // Mock trend data for now
          trend: { $cond: [{ $gte: ["$gross", 10000] }, "up", "down"] },
          trendPercentage: { $abs: { $multiply: [{ $rand: {} }, 10] } },
        },
      },
    ];

    const topLocations = await Machine.aggregate(locationsPipeline);

    return NextResponse.json({
      topLocations,
    });
  } catch (error) {
    console.error("Error fetching location analytics:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch location analytics",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
