import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Meters } from "@/app/api/lib/models/meters";
import { subDays } from "date-fns";
import mongoose, { PipelineStage } from "mongoose";

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
    const licenseeId = new mongoose.Types.ObjectId(licensee);

    if (period === "last7days") {
      startDate = subDays(endDate, 7);
    } else {
      startDate = subDays(endDate, 30);
    }

    const chartsPipeline: PipelineStage[] = [
      // Stage 1: Filter meter records by date range
      {
        $match: {
          readAt: { $gte: startDate, $lte: endDate },
        },
      },
      
      // Stage 2: Join meters with machines to get machine details
      {
        $lookup: {
          from: "machines",
          localField: "machine",
          foreignField: "_id",
          as: "machineDetails",
        },
      },
      
      // Stage 3: Flatten the machine details array (each meter now has machine info)
      {
        $unwind: "$machineDetails",
      },
      
      // Stage 4: Join with gaming locations to get location details
      {
        $lookup: {
          from: "gaminglocations",
          localField: "machineDetails.gamingLocation",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      
      // Stage 5: Flatten the location details array (each meter now has location info)
      {
        $unwind: "$locationDetails",
      },
      
      // Stage 6: Filter by licensee to get only relevant meters
      {
        $match: {
          "locationDetails.licensee": licenseeId,
        },
      },
      
      // Stage 7: Group by date to aggregate daily financial metrics
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$readAt" } },
          totalDrop: { $sum: { $ifNull: ["$drop", 0] } },
          cancelledCredits: {
            $sum: { $ifNull: ["$totalCancelledCredits", 0] },
          },
          gross: {
            $sum: {
              $subtract: [
                { $ifNull: ["$drop", 0] },
                { $ifNull: ["$totalCancelledCredits", 0] },
              ],
            },
          },
        },
      },
      
      // Stage 8: Sort by date for chronological order
      {
        $sort: { _id: 1 },
      },
      
      // Stage 9: Project final chart data structure
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

    const series = await Meters.aggregate(chartsPipeline);

    return NextResponse.json({ series });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch chart data",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
