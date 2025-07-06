import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Meter } from "@/app/api/lib/models/meters";
import { subDays } from "date-fns";
import type { PipelineStage } from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get("licensee");
    const period = searchParams.get("period") ?? "last30days";

    if (!licensee) {
      return NextResponse.json(
        { message: "Licensee is required" },
        { status: 400 }
      );
    }

    let startDate: Date;
    const endDate = new Date();

    if (period === "last7days") {
      startDate = subDays(endDate, 7);
    } else {
      startDate = subDays(endDate, 30);
    }

    const chartsPipeline: PipelineStage[] = [
      {
        $match: {
          readAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: "machines",
          localField: "machine",
          foreignField: "_id",
          as: "machineDetails",
        },
      },
      {
        $unwind: "$machineDetails",
      },
      {
        $lookup: {
          from: "gaminglocations",
          localField: "machineDetails.gamingLocation",
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
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$readAt" } },
          totalDrop: { $sum: { $ifNull: ["$drop", 0] } },
          cancelledCredits: { $sum: { $ifNull: ["$totalCancelledCredits", 0] } },
          gross: {
            $sum: {
              $subtract: [
                { $ifNull: ["$coinIn", 0] },
                {
                  $add: [
                    { $ifNull: ["$coinOut", 0] },
                    { $ifNull: ["$jackpot", 0] },
                  ],
                },
              ],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalDrop: "$totalDrop",
          cancelledCredits: "$cancelledCredits",
          gross: "$gross",
        },
      },
    ];

    const series = await Meter.aggregate(chartsPipeline);

    return NextResponse.json({ series });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { message: "Failed to fetch chart data", error: (error as Error).message },
      { status: 500 }
    );
  }
} 