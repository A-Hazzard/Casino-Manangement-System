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
    const stats = statsResult[0] || {
      totalDrop: 0,
      totalCancelledCredits: 0,
      totalGross: 0,
      totalMachines: 0,
      onlineMachines: 0,
      sasMachines: 0,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching machine stats:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch machine stats",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
} 