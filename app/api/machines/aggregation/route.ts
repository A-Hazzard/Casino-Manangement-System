import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "../../lib/middleware/db";
import { TimePeriod } from "@shared/types";
import {
  MachineMatchStage,
  MachineAggregationMatchStage,
} from "@/lib/types/machines";
import { getDateRangeForTimePeriodAlt, DateRangeAlt } from "@/app/api/lib/utils/dateUtils";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // Get parameters from search params
    const locationId = searchParams.get("locationId");
    const searchTerm = searchParams.get("search")?.trim() || "";
    const licensee = searchParams.get("licensee");
    const timePeriod = searchParams.get("timePeriod");
    
    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return NextResponse.json(
        { error: "timePeriod parameter is required" },
        { status: 400 }
      );
    }
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Log the query parameters for debugging

    // Get date range for time period filtering
    let dateRange: DateRangeAlt;
    if (startDateParam && endDateParam) {
      // For custom date ranges, the frontend sends dates that represent
      // the start and end of the day in Trinidad time, already converted to UTC
      const customStartDate = new Date(startDateParam);
      let customEndDate = new Date(endDateParam);
      
      // The end date from frontend represents the start of the end day in Trinidad time
      // We need to extend it to the end of that day (23:59:59 Trinidad time = 03:59:59 UTC next day)
      customEndDate = new Date(customEndDate.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
      
      dateRange = {
        start: customStartDate,
        end: customEndDate,
      };
      
      console.warn("🔍 API - Custom date range debug (machines aggregation):");
      console.warn("🔍 API - Original start date:", startDateParam);
      console.warn("🔍 API - Original end date:", endDateParam);
      console.warn("🔍 API - Extended end date (UTC):", dateRange.end.toISOString());
      console.warn("🔍 API - Parsed start date (UTC):", dateRange.start.toISOString());
    } else {
      dateRange = getDateRangeForTimePeriodAlt(timePeriod as TimePeriod);
    }

    const { start, end } = dateRange;

    // We only want "active" locations
    const matchStage: MachineAggregationMatchStage = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    };
    if (locationId) {
      matchStage._id = locationId; // locationId is a string, not ObjectId
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
      // Filter out deleted machines
      {
        $match: {
          $or: [
            { "machines.deletedAt": null },
            { "machines.deletedAt": { $lt: new Date("2020-01-01") } },
          ],
        },
      },
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
                sumMoneyOut: { $sum: "$movement.totalCancelledCredits" },
                sumJackpot: { $sum: "$movement.jackpot" },
                sumCoinIn: { $sum: "$movement.coinIn" },
                sumCoinOut: { $sum: "$movement.coinOut" },
                sumGamesPlayed: { $sum: "$movement.gamesPlayed" },
                sumGamesWon: { $sum: "$movement.gamesWon" },
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
        serialNumber: { $ifNull: ["$machines.serialNumber", ""] },
        smbId: { $ifNull: ["$machines.relayId", ""] },
        relayId: { $ifNull: ["$machines.relayId", ""] },
        installedGame: { $ifNull: ["$machines.game", ""] },
        game: { $ifNull: ["$machines.game", ""] },
        manufacturer: { $ifNull: ["$machines.manufacturer", "$machines.manuf", "Unknown Manufacturer"] },
        status: { $ifNull: ["$machines.assetStatus", ""] },
        assetStatus: { $ifNull: ["$machines.assetStatus", ""] },
        cabinetType: { $ifNull: ["$machines.cabinetType", ""] },
        accountingDenomination: {
          $ifNull: ["$machines.gameConfig.accountingDenomination", "1"],
        },
        collectionMultiplier: { $literal: "1" }, // Default value
        isCronosMachine: { $literal: false }, // Default value since field doesn't exist in DB
        lastOnline: "$machines.lastActivity",
        lastActivity: "$machines.lastActivity",
        // Financial metrics from meter aggregation
        moneyIn: { $ifNull: ["$meterAgg.sumDrop", 0] },
        moneyOut: { $ifNull: ["$meterAgg.sumMoneyOut", 0] },
        cancelledCredits: { $ifNull: ["$meterAgg.sumMoneyOut", 0] },
        jackpot: { $ifNull: ["$meterAgg.sumJackpot", 0] },
        gross: {
          $subtract: [
            { $ifNull: ["$meterAgg.sumDrop", 0] },
            { $ifNull: ["$meterAgg.sumMoneyOut", 0] },
          ],
        },
        // Additional metrics for comprehensive financial tracking
        coinIn: { $ifNull: ["$meterAgg.sumCoinIn", 0] },
        coinOut: { $ifNull: ["$meterAgg.sumCoinOut", 0] },
        gamesPlayed: { $ifNull: ["$meterAgg.sumGamesPlayed", 0] },
        gamesWon: { $ifNull: ["$meterAgg.sumGamesWon", 0] },
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
      const locations = await GamingLocations.find({
        ...matchStage,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date("2020-01-01") } },
        ],
      }).lean();

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
          // Filter out deleted machines (same as main pipeline)
          {
            $match: {
              $or: [
                { "machines.deletedAt": null },
                { "machines.deletedAt": { $lt: new Date("2020-01-01") } },
              ],
            },
          },
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
                    sumMoneyOut: { $sum: "$movement.totalCancelledCredits" },
                    sumJackpot: { $sum: "$movement.jackpot" },
                    sumCoinIn: { $sum: "$movement.coinIn" },
                    sumCoinOut: { $sum: "$movement.coinOut" },
                    sumGamesPlayed: { $sum: "$movement.gamesPlayed" },
                    sumGamesWon: { $sum: "$movement.gamesWon" },
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
              serialNumber: { $ifNull: ["$machines.serialNumber", ""] },
              smbId: { $ifNull: ["$machines.relayId", ""] },
              relayId: { $ifNull: ["$machines.relayId", ""] },
              installedGame: { $ifNull: ["$machines.game", ""] },
              game: { $ifNull: ["$machines.game", ""] },
              status: { $ifNull: ["$machines.assetStatus", ""] },
              assetStatus: { $ifNull: ["$machines.assetStatus", ""] },
              cabinetType: { $ifNull: ["$machines.cabinetType", ""] },
              accountingDenomination: {
                $ifNull: ["$machines.gameConfig.accountingDenomination", "1"],
              },
              collectionMultiplier: { $literal: "1" }, // Default value
              isCronosMachine: { $literal: false }, // Default value since field doesn't exist in DB
              lastOnline: "$machines.lastActivity",
              lastActivity: "$machines.lastActivity",
              // Financial metrics from meter aggregation
              moneyIn: { $ifNull: ["$meterAgg.sumDrop", 0] },
              moneyOut: { $ifNull: ["$meterAgg.sumMoneyOut", 0] },
              cancelledCredits: {
                $ifNull: ["$meterAgg.sumMoneyOut", 0],
              },
              jackpot: { $ifNull: ["$meterAgg.sumJackpot", 0] },
              gross: {
                $subtract: [
                  { $ifNull: ["$meterAgg.sumDrop", 0] },
                  { $ifNull: ["$meterAgg.sumMoneyOut", 0] },
                ],
              },
              // Additional metrics for comprehensive financial tracking
              coinIn: { $ifNull: ["$meterAgg.sumCoinIn", 0] },
              coinOut: { $ifNull: ["$meterAgg.sumCoinOut", 0] },
              gamesPlayed: { $ifNull: ["$meterAgg.sumGamesPlayed", 0] },
              gamesWon: { $ifNull: ["$meterAgg.sumGamesWon", 0] },
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
