import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";

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

    const globalStatsPipeline = [
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
          _id: null,
          totalDrop: { $sum: { $ifNull: ["$sasMeters.coinIn", 0] } },
          totalCancelledCredits: { $sum: { $ifNull: ["$sasMeters.totalCancelledCredits", 0] } },
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
      {
        $project: {
            _id: 0,
        }
      }
    ];

    const statsResult = await Machine.aggregate(globalStatsPipeline);
    const globalStats = statsResult[0] || {
        totalDrop: 0,
        totalCancelledCredits: 0,
        totalGross: 0,
        totalMachines: 0,
        onlineMachines: 0,
        sasMachines: 0
    };

    return NextResponse.json({ globalStats });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard analytics", error: (error as Error).message },
      { status: 500 }
    );
  }
}
