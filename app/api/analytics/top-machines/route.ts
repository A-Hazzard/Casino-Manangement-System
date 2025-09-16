import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const timePeriod = searchParams.get("timePeriod") || "24h";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Calculate date range based on time period
    let start, end;
    const now = new Date();

    if (timePeriod === "Custom" && startDate && endDate) {
      // Parse custom dates and apply timezone handling
      // Create dates in Trinidad timezone (UTC-4)
      const customStartDate = new Date(startDate + 'T00:00:00-04:00');
      const customEndDate = new Date(endDate + 'T23:59:59-04:00');
      
      // Convert to UTC for database queries
      start = new Date(customStartDate.getTime());
      end = new Date(customEndDate.getTime());
    } else {
      switch (timePeriod) {
        case "24h":
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          end = now;
          break;
        case "7d":
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case "30d":
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        default:
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          end = now;
      }
    }

    // Aggregate top machines for the location using meters collection
    const pipeline = [
      {
        $match: {
          location: locationId,
          readAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$machine",
          totalDrop: { $sum: { $ifNull: ["$movement.drop", 0] } },
          totalCancelledCredits: { $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] } },
          totalGamesPlayed: { $sum: { $ifNull: ["$movement.gamesPlayed", 0] } },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "_id",
          as: "machineInfo",
        },
      },
      {
        $unwind: {
          path: "$machineInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          id: "$_id",
          name: { $ifNull: ["$machineInfo.serialNumber", "Unknown Machine"] },
          revenue: { $subtract: ["$totalDrop", "$totalCancelledCredits"] },
          drop: "$totalDrop",
          cancelledCredits: "$totalCancelledCredits",
          gamesPlayed: "$totalGamesPlayed",
          count: 1,
          hold: {
            $cond: [
              { $gt: ["$totalDrop", 0] },
              { $multiply: [{ $divide: [{ $subtract: ["$totalDrop", "$totalCancelledCredits"] }, "$totalDrop"] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $sort: { revenue: -1 },
      },
      {
        $limit: 5,
      },
    ];

    const topMachines = await db
      .collection("meters")
      .aggregate(pipeline)
      .toArray();

    return NextResponse.json(topMachines);
  } catch (error) {
    console.error("Error fetching top machines data:", error);
    return NextResponse.json(
      { error: "Failed to fetch top machines data" },
      { status: 500 }
    );
  }
}
