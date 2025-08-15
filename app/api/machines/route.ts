import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import mongoose from "mongoose";
import { NewMachineData, MachineUpdateData } from "@/lib/types/machines";
// TODO: Import date utilities when implementing date filtering
// import { getDatesForTimePeriod } from "../lib/utils/dates";
import { Meters } from "../lib/models/meters";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const id = request.nextUrl.searchParams.get("id");
    const timePeriod = request.nextUrl.searchParams.get("timePeriod");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Cabinet ID is required" },
        { status: 400 }
      );
    }

    // Fetch machine with all associated data for optimal performance
    const machine = await Machine.findOne({ _id: id });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: "Cabinet not found" },
        { status: 404 }
      );
    }

    // Implement timezone-aware date filtering using $facet aggregation
    // This approach calculates all time periods in a single efficient query
    let meterData;

    if (timePeriod && timePeriod !== "All Time") {
      // Use $facet to calculate specific time period efficiently
      const facetAggregation = await Meters.aggregate([
        // 1) Restrict to the machine
        { $match: { machine: id } },

        // 2) Compute time boundaries (use Trinidad timezone)
        {
          $set: {
            tz: "America/Port_of_Spain",
            now: "$$NOW",
          },
        },
        {
          $set: {
            todayStart: {
              $dateTrunc: { date: "$now", unit: "day", timezone: "$tz" },
            },
            tomorrowStart: {
              $dateAdd: {
                startDate: {
                  $dateTrunc: { date: "$now", unit: "day", timezone: "$tz" },
                },
                unit: "day",
                amount: 1,
              },
            },
            last7Start: {
              $dateSubtract: { startDate: "$now", unit: "day", amount: 7 },
            },
            last30Start: {
              $dateSubtract: { startDate: "$now", unit: "day", amount: 30 },
            },
          },
        },

        // 3) Compute the requested time window
        {
          $facet: {
            [timePeriod]: (() => {
              switch (timePeriod) {
                case "Today":
                  return [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $gte: ["$createdAt", "$todayStart"] },
                            { $lt: ["$createdAt", "$tomorrowStart"] },
                          ],
                        },
                      },
                    },
                    {
                      $group: {
                        _id: null,
                        drop: { $sum: "$movement.drop" },
                        totalCancelledCredits: {
                          $sum: "$movement.totalCancelledCredits",
                        },
                        jackpot: { $sum: "$movement.jackpot" },
                        coinIn: { $sum: "$movement.coinIn" },
                        coinOut: { $sum: "$movement.coinOut" },
                        gamesPlayed: { $sum: "$movement.gamesPlayed" },
                        gamesWon: { $sum: "$movement.gamesWon" },
                      },
                    },
                  ];
                case "Yesterday":
                  return [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $gte: [
                                "$createdAt",
                                {
                                  $dateSubtract: {
                                    startDate: "$todayStart",
                                    unit: "day",
                                    amount: 1,
                                  },
                                },
                              ],
                            },
                            { $lt: ["$createdAt", "$todayStart"] },
                          ],
                        },
                      },
                    },
                    {
                      $group: {
                        _id: null,
                        drop: { $sum: "$movement.drop" },
                        totalCancelledCredits: {
                          $sum: "$movement.totalCancelledCredits",
                        },
                        jackpot: { $sum: "$movement.jackpot" },
                        coinIn: { $sum: "$movement.coinIn" },
                        coinOut: { $sum: "$movement.coinOut" },
                        gamesPlayed: { $sum: "$movement.gamesPlayed" },
                        gamesWon: { $sum: "$movement.gamesWon" },
                      },
                    },
                  ];
                case "7d":
                  return [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $gte: ["$createdAt", "$last7Start"] },
                            { $lt: ["$createdAt", "$now"] },
                          ],
                        },
                      },
                    },
                    {
                      $group: {
                        _id: null,
                        drop: { $sum: "$movement.drop" },
                        totalCancelledCredits: {
                          $sum: "$movement.totalCancelledCredits",
                        },
                        jackpot: { $sum: "$movement.jackpot" },
                        coinIn: { $sum: "$movement.coinIn" },
                        coinOut: { $sum: "$movement.coinOut" },
                        gamesPlayed: { $sum: "$movement.gamesPlayed" },
                        gamesWon: { $sum: "$movement.gamesWon" },
                      },
                    },
                  ];
                case "30d":
                  return [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $gte: ["$createdAt", "$last30Start"] },
                            { $lt: ["$createdAt", "$now"] },
                          ],
                        },
                      },
                    },
                    {
                      $group: {
                        _id: null,
                        drop: { $sum: "$movement.drop" },
                        totalCancelledCredits: {
                          $sum: "$movement.totalCancelledCredits",
                        },
                        jackpot: { $sum: "$movement.jackpot" },
                        coinIn: { $sum: "$movement.coinIn" },
                        coinOut: { $sum: "$movement.coinOut" },
                        gamesPlayed: { $sum: "$movement.gamesPlayed" },
                        gamesWon: { $sum: "$movement.gamesWon" },
                      },
                    },
                  ];
                default:
                  return [{ $group: { _id: null, drop: { $literal: 0 } } }];
              }
            })(),
          },
        },

        // 4) Coalesce empty results to 0
        {
          $project: {
            machine: id,
            drop: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.drop`, 0] }, 0],
            },
            totalCancelledCredits: {
              $ifNull: [
                { $arrayElemAt: [`$${timePeriod}.totalCancelledCredits`, 0] },
                0,
              ],
            },
            jackpot: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.jackpot`, 0] }, 0],
            },
            coinIn: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.coinIn`, 0] }, 0],
            },
            coinOut: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.coinOut`, 0] }, 0],
            },
            gamesPlayed: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.gamesPlayed`, 0] }, 0],
            },
            gamesWon: {
              $ifNull: [{ $arrayElemAt: [`$${timePeriod}.gamesWon`, 0] }, 0],
            },
          },
        },
      ]);

      meterData = facetAggregation;
    } else {
      // Fetch all meter data without filtering (All Time)
      meterData = await Meters.aggregate([
        { $match: { machine: id } },
        {
          $group: {
            _id: null,
            // Financial metrics as per financial-metrics-guide.md
            drop: { $sum: "$movement.drop" }, // Money In (Handle)
            totalCancelledCredits: { $sum: "$movement.totalCancelledCredits" }, // Money Out
            jackpot: { $sum: "$movement.jackpot" },
            coinIn: { $sum: "$movement.coinIn" },
            coinOut: { $sum: "$movement.coinOut" },
            gamesPlayed: { $sum: "$movement.gamesPlayed" },
            gamesWon: { $sum: "$movement.gamesWon" },
          },
        },
      ]);
    }

    // Integrate meter data with machine data
    if (meterData.length > 0) {
      const aggregatedMeters = meterData[0];
      machine.sasMeters = {
        drop: aggregatedMeters.drop || 0,
        totalCancelledCredits: aggregatedMeters.totalCancelledCredits || 0,
        jackpot: aggregatedMeters.jackpot || 0,
        coinIn: aggregatedMeters.coinIn || 0,
        coinOut: aggregatedMeters.coinOut || 0,
        gamesPlayed: aggregatedMeters.gamesPlayed || 0,
        gamesWon: aggregatedMeters.gamesWon || 0,
      };

      // Also update meterData for compatibility
      machine.meterData = {
        movement: machine.sasMeters,
      };
    }

    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    console.error("Error fetching machine:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch machine" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await connectDB();

    if (!db) {
      console.error("Failed to connect to the database");
      return NextResponse.json(
        { success: false, error: "Failed to connect to the database" },
        { status: 500 }
      );
    }

    const data = (await request.json()) as NewMachineData;

    // Check if we have a location ID
    if (!data.gamingLocation) {
      return NextResponse.json(
        { success: false, error: "Location ID is required" },
        { status: 400 }
      );
    }

    // Validate location ID if provided
    if (
      data.gamingLocation &&
      !mongoose.Types.ObjectId.isValid(data.gamingLocation)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid location ID format" },
        { status: 400 }
      );
    }

    const newMachine = new Machine({
      serialNumber: data.serialNumber,
      game: data.game,
      gameType: data.gameType,
      isCronosMachine: data.isCronosMachine,
      gameConfig: {
        accountingDenomination:
          parseFloat(data.accountingDenomination.toString()) || 0,
      },
      cabinetType: data.cabinetType,
      assetStatus: data.assetStatus,
      gamingLocation: data.gamingLocation, // Set the location ID
      relayId: data.smibBoard,
      collectionTime: data.collectionSettings?.lastCollectionTime,
      collectionMeters: {
        metersIn: parseFloat(data.collectionSettings?.lastMetersIn || "0") || 0,
        metersOut:
          parseFloat(data.collectionSettings?.lastMetersOut || "0") || 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newMachine.save();

    return NextResponse.json({
      success: true,
      data: newMachine,
    });
  } catch (error) {
    console.error("Failed to create new machine:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create new machine" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Cabinet ID is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid cabinet ID format" },
        { status: 400 }
      );
    }

    const data = (await request.json()) as MachineUpdateData;
    const updatedMachine = await Machine.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: "Cabinet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMachine,
    });
  } catch (error) {
    console.error("Error updating machine:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update machine" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Cabinet ID is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid cabinet ID format" },
        { status: 400 }
      );
    }

    const result = await Machine.findByIdAndUpdate(id, {
      $set: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Cabinet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cabinet deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting cabinet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete cabinet" },
      { status: 500 }
    );
  }
}
