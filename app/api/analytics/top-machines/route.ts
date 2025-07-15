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
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }
    
    // Calculate date range based on time period
    let start, end;
    const now = new Date();
    
    if (timePeriod === "Custom" && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
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

    // Aggregate top machines for the location
    const pipeline = [
      {
        $match: {
          location: locationId,
          createdAt: { $gte: start, $lte: end },
          deletedAt: { $in: [null, new Date(-1)] }
        }
      },
      {
        $group: {
          _id: "$machine",
          revenue: { $sum: "$gross" },
          drop: { $sum: "$moneyIn" },
          cancelledCredits: { $sum: "$moneyOut" },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "_id",
          as: "machineInfo"
        }
      },
      {
        $unwind: {
          path: "$machineInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          id: "$_id",
          name: { $ifNull: ["$machineInfo.name", "Unknown Machine"] },
          revenue: 1,
          drop: 1,
          cancelledCredits: 1,
          count: 1,
          hold: {
            $cond: [
              { $gt: ["$drop", 0] },
              { $multiply: [{ $divide: ["$revenue", "$drop"] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 5
      }
    ];

    const topMachines = await db.collection("collectionReports").aggregate(pipeline).toArray();

    return NextResponse.json(topMachines);
  } catch (error) {
    console.error("Error fetching top machines data:", error);
    return NextResponse.json({ error: "Failed to fetch top machines data" }, { status: 500 });
  }
} 