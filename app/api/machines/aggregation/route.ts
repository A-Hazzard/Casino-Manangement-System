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
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (timePeriod) {
    case "Today":
      // Start of today
      start.setHours(0, 0, 0, 0);
      break;
    case "Yesterday":
      // Start of yesterday
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      // End of yesterday
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "last7days":
      // 7 days ago
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "last30days":
      // 30 days ago
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "Custom":
      // Custom date range would need to be handled with additional parameters
      // For now, default to last 30 days if Custom is specified without dates
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      // Default to Today if no valid time period is specified
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    console.log("🔌 [0%] Connecting to DB...");
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
    console.log("📋 Query Parameters:", {
      locationId,
      searchTerm,
      licensee,
      timePeriod,
      startDate: startDateParam,
      endDate: endDateParam,
    });

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

    console.log(
      `📅 Time period: ${timePeriod}, Date range: ${start.toISOString()} to ${end.toISOString()}`
    );

    // We only want "active" locations
    const matchStage: MachineAggregationMatchStage = {
      deletedAt: { $in: [null, new Date(-1)] },
    };
    if (locationId) {
      matchStage._id = new mongoose.Types.ObjectId(locationId);
    }

    if (licensee) {
      matchStage["rel.licencee"] = licensee;
      console.log(`🔍 Filtering by licencee: ${licensee}`);
    } else {
      console.log("🔍 No licencee filter applied, showing all licencees");
    }

    console.log("📊 [30%] Building aggregation pipeline...");
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

    console.log("🚀 [90%] Executing aggregation...");

    const result = await GamingLocations.aggregate(pipeline).exec();

    console.log(
      `✅ [100%] Aggregation complete. Returning ${result.length} cabinets`
    );

    // Log a sample of the results if they exist
    if (result.length > 0) {
      console.log("Sample result:", JSON.stringify(result[0], null, 2));
      return NextResponse.json(
        { success: true, data: result },
        { status: 200 }
      );
    } else {
      console.log(
        "No results returned from aggregation. Checking for locations..."
      );

      // Check if there are any gaming locations matching the filter
      const locations = await GamingLocations.find(matchStage).lean();
      console.log(
        `Found ${locations.length} gaming locations matching filter criteria.`
      );

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

        console.log(
          `Found ${locationsWithMachines.length} locations with machines.`
        );
        if (locationsWithMachines.length > 0) {
          console.log(
            "Sample machine data:",
            JSON.stringify(locationsWithMachines[0], null, 2)
          );
          return NextResponse.json(
            { success: true, data: locationsWithMachines },
            { status: 200 }
          );
        }
      }

      // If we got here, no data matched our criteria
      console.log("No locations with machines found. Returning empty array.");
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
