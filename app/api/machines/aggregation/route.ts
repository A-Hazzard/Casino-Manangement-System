import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "../../lib/middleware/db";
import { DateRange, TimePeriod } from "@shared/types";
import {
  MachineMatchStage,
  MachineAggregationMatchStage,
} from "@/lib/types/machines";

// Helper function to get date range based on time period
function getDateRangeForTimePeriod(timePeriod: string): DateRange {
  // Use timezone-aware date calculations for Trinidad
  const tz = "America/Port_of_Spain";
  const now = new Date();

  let start: Date;
  let end: Date;

  switch (timePeriod) {
    case "Today":
      // Start of today in Trinidad timezone
      start = new Date(
        now.toLocaleDateString("en-CA", { timeZone: tz }) + "T00:00:00.000Z"
      );
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;
    case "Yesterday":
      // Start of yesterday in Trinidad timezone
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      start = new Date(
        yesterday.toLocaleDateString("en-CA", { timeZone: tz }) +
          "T00:00:00.000Z"
      );
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;
    case "7d":
    case "last7days":
      // 7 days ago
      end = now;
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
    case "last30days":
      // 30 days ago
      end = now;
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "Custom":
      // Custom date range would need to be handled with additional parameters
      // For now, default to last 30 days if Custom is specified without dates
      end = now;
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      // Default to Today if no valid time period is specified
      start = new Date(
        now.toLocaleDateString("en-CA", { timeZone: tz }) + "T00:00:00.000Z"
      );
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // Get parameters from search params
    const locationId = searchParams.get("locationId");
    const searchTerm = searchParams.get("search")?.trim() || "";
    const licensee = searchParams.get("licensee");
    const timePeriod = searchParams.get("timePeriod") || "Today";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Log the query parameters for debugging

    // Get date range for time period filtering
    let dateRange: DateRange;
    if (startDateParam && endDateParam) {
      dateRange = {
        start: new Date(startDateParam),
        end: new Date(endDateParam),
      };
    } else {
      dateRange = getDateRangeForTimePeriod(timePeriod as TimePeriod);
    }

    const { start, end } = dateRange;

    // We only want "active" locations
    const matchStage: MachineAggregationMatchStage = {
      deletedAt: { $in: [null, new Date(-1)] },
    };
    if (locationId) {
      matchStage._id = new mongoose.Types.ObjectId(locationId);
    }

    if (licensee) {
      matchStage["rel.licencee"] = licensee;
    } else {
    }

    const pipeline: mongoose.PipelineStage[] = [
      // 1) match relevant location(s)
      { $match: matchStage },

      // 2) join machines with proper fields
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "gamingLocation",
          as: "machines",
        },
      },
      // Flatten machines
      { $unwind: { path: "$machines", preserveNullAndEmptyArrays: false } },
    ];

    // 3) If user typed a searchTerm
    if (searchTerm) {
      pipeline.push({
        $match: {
          $or: [
            // match machine's serialNumber
            { "machines.serialNumber": { $regex: searchTerm, $options: "i" } },
            // match machine's relayId (SMIB)
            { "machines.relayId": { $regex: searchTerm, $options: "i" } },
            // match location name
            { name: { $regex: searchTerm, $options: "i" } },
          ] as MachineMatchStage[],
        },
      });
    }

    // 4) Sort by lastActivity desc
    pipeline.push({
      $sort: {
        "machines.lastActivity": -1,
      },
    });

    // 5) Summation of meters for each machine - filtered by time period
    pipeline.push(
      {
        $lookup: {
          from: "meters",
          let: { machineId: "$machines._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    // match meter.machine == $$machineId
                    { $eq: ["$machine", "$$machineId"] },
                    // filter by readAt date within the selected time period
                    { $gte: ["$readAt", start] },
                    { $lte: ["$readAt", end] },
                  ],
                },
              },
            },
            // sum up the movement
            {
              $group: {
                _id: null,
                sumDrop: { $sum: "$movement.drop" },
                sumOut: { $sum: "$movement.totalCancelledCredits" },
                sumJackpot: { $sum: "$movement.jackpot" },
              },
            },
          ],
          as: "meterAgg",
        },
      },
      {
        $unwind: {
          path: "$meterAgg",
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    // 6) Final project, update to ensure relayId is included
    pipeline.push({
      $project: {
        _id: "$machines._id",
        locationId: "$_id",
        locationName: { $ifNull: ["$name", "(No Location)"] },
        assetNumber: { $ifNull: ["$machines.serialNumber", ""] },
        smbId: { $ifNull: ["$machines.relayId", ""] },
        lastOnline: "$machines.lastActivity",
        moneyIn: { $ifNull: ["$meterAgg.sumDrop", 0] },
        moneyOut: { $ifNull: ["$meterAgg.sumOut", 0] },
        jackpot: { $ifNull: ["$meterAgg.sumJackpot", 0] },
        gross: {
          $subtract: [
            { $ifNull: ["$meterAgg.sumDrop", 0] },
            { $ifNull: ["$meterAgg.sumOut", 0] },
          ],
        },
        timePeriod: { $literal: timePeriod },
      },
    });

    const result = await GamingLocations.aggregate(pipeline).exec();

    // Log a sample of the results if they exist
    if (result.length > 0) {
      return NextResponse.json(
        { success: true, data: result },
        { status: 200 }
      );
    } else {
      // Check if there are any gaming locations matching the filter
      const locations = await GamingLocations.find(matchStage).lean();

      if (locations.length > 0) {
        // Check if these locations have machines
        const locationsWithMachines = await GamingLocations.aggregate([
          { $match: matchStage },
          {
            $lookup: {
              from: "machines",
              localField: "_id",
              foreignField: "gamingLocation",
              as: "machines",
            },
          },
          // Unwind the machines array to create a document for each machine
          { $unwind: { path: "$machines", preserveNullAndEmptyArrays: true } },
          // Only keep locations with machines
          { $match: { "machines._id": { $exists: true } } },
          // Look up meters for each machine with time period filter
          {
            $lookup: {
              from: "meters",
              let: { machineId: "$machines._id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$machine", "$$machineId"] },
                        // filter by readAt date within the selected time period
                        { $gte: ["$readAt", start] },
                        { $lte: ["$readAt", end] },
                      ],
                    },
                  },
                },
                {
                  $group: {
                    _id: null,
                    sumDrop: { $sum: "$movement.drop" },
                    sumOut: { $sum: "$movement.totalCancelledCredits" },
                    sumJackpot: { $sum: "$movement.jackpot" },
                  },
                },
              ],
              as: "meterAgg",
            },
          },
          { $unwind: { path: "$meterAgg", preserveNullAndEmptyArrays: true } },
          // Project the same fields as the main pipeline
          {
            $project: {
              _id: "$machines._id",
              locationId: "$_id",
              locationName: { $ifNull: ["$name", "(No Location)"] },
              assetNumber: { $ifNull: ["$machines.serialNumber", ""] },
              smbId: { $ifNull: ["$machines.relayId", ""] },
              lastOnline: "$machines.lastActivity",
              moneyIn: { $ifNull: ["$meterAgg.sumDrop", 0] },
              moneyOut: { $ifNull: ["$meterAgg.sumOut", 0] },
              jackpot: { $ifNull: ["$meterAgg.sumJackpot", 0] },
              gross: {
                $subtract: [
                  { $ifNull: ["$meterAgg.sumDrop", 0] },
                  { $ifNull: ["$meterAgg.sumOut", 0] },
                ],
              },
              timePeriod: { $literal: timePeriod },
            },
          },
        ]);

        if (locationsWithMachines.length > 0) {
          return NextResponse.json(
            { success: true, data: locationsWithMachines },
            { status: 200 }
          );
        }
      }

      // If we got here, no data matched our criteria
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }
  } catch (error) {
    console.error("❌ Error in machineAggregation route:", error);
    return NextResponse.json(
      { success: false, error: "Aggregation failed", details: String(error) },
      { status: 500 }
    );
  }
}
