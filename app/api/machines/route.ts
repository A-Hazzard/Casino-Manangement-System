import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import { Collections } from "@/app/api/lib/models/collections";
import { NewMachineData, MachineUpdateData } from "@/lib/types/machines";
// TODO: Import date utilities when implementing date filtering
// import { getDatesForTimePeriod } from "../lib/utils/dates";
import { Meters } from "../lib/models/meters";
import { convertResponseToTrinidadTime } from "@/app/api/lib/utils/timezone";
import { generateMongoId } from "@/lib/utils/id";

import {
  logActivity,
  calculateChanges,
} from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "@/lib/utils/user";
import { getClientIP } from "@/lib/utils/ipAddress";

// Validation helpers mirroring frontend rules
function validateSerialNumber(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length < 3) {
    return "Serial number must be at least 3 characters long";
  }
  return null;
}

function normalizeSerialNumber(value: string): string {
  return value.toUpperCase();
}

function validateSmibBoard(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    // Optional field – no error when empty
    return null;
  }
  if (typeof value !== "string") {
    return "SMIB Board must be a string";
  }
  const v = value.toLowerCase();
  if (v.length !== 12) {
    return "SMIB Board must be exactly 12 characters long";
  }
  if (!/^[0-9a-f]+$/.test(v)) {
    return "SMIB Board must contain only lowercase hexadecimal characters (0-9, a-f)";
  }
  const lastChar = v.charAt(11);
  if (!["0", "4", "8", "c"].includes(lastChar)) {
    return "SMIB Board must end with 0, 4, 8, or c";
  }
  return null;
}

function normalizeSmibBoard(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.toLowerCase();
}


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
    const machine = await Machine.findOne({
      _id: id,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    });

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
      data: convertResponseToTrinidadTime(machine),
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

    // Backend validations mirroring frontend
    const serialNumberError = validateSerialNumber(data.serialNumber);
    if (serialNumberError) {
      return NextResponse.json(
        { success: false, error: serialNumberError },
        { status: 400 }
      );
    }
    const smibError = validateSmibBoard(data.smibBoard);
    if (smibError) {
      return NextResponse.json(
        { success: false, error: smibError },
        { status: 400 }
      );
    }

    // Normalize fields
    data.serialNumber = normalizeSerialNumber(data.serialNumber);
    data.smibBoard = normalizeSmibBoard(data.smibBoard) ?? "";

    // Check if we have a location ID
    if (!data.gamingLocation) {
      return NextResponse.json(
        { success: false, error: "Location ID is required" },
        { status: 400 }
      );
    }

    // Location ID validation removed - gamingLocation is stored as String, not ObjectId

    // Generate a proper MongoDB ObjectId-style hex string for the machine
    const machineId = await generateMongoId();

    const newMachine = new Machine({
      _id: machineId,
      serialNumber: data.serialNumber,
      game: data.game,
      gameType: data.gameType || "slot", // Default to "slot" if not provided
      isCronosMachine: data.isCronosMachine,
      // Handle isCronosMachine vs isSasMachine logic
      isSasMachine: data.isCronosMachine ? false : true, // If Cronos, not SAS. If not given, default to SAS
      loggedIn: false, // Default to not logged in
      machineMembershipSettings: {
        isPointsAllowed: true,
        isFreePlayAllowed: true,
        pointsAwardMethod: "gamesPlayed",
        freePlayAmount: 200,
        freePlayCreditsTimeout: 86400,
      },
      nonRestricted: 0,
      restricted: 0,
      sasVersion: "",
      uaccount: 0,
      gameConfig: {
        accountingDenomination:
          parseFloat(data.accountingDenomination.toString()) || 0,
        additionalId: "",
        gameOptions: "",
        maxBet: "",
        payTableId: "",
        progressiveGroup: "",
        theoreticalRtp: 0,
      },
      cabinetType: data.cabinetType,
      assetStatus: data.assetStatus,
      gamingLocation: data.gamingLocation, // Set the location ID
      relayId: data.smibBoard,
      collectionTime: data.collectionSettings?.lastCollectionTime,
      previousCollectionTime: null, // Default to null for new machines
      collectionMeters: {
        metersIn: parseFloat(data.collectionSettings?.lastMetersIn || "0") || 0,
        metersOut:
          parseFloat(data.collectionSettings?.lastMetersOut || "0") || 0,
      },
      // Add all missing fields with default values
      billValidator: {
        balance: 0,
        notes: [],
      },
      config: {
        enableRte: false,
        lockMachine: false,
        lockBvOnLogOut: false,
      },
      playableBalance: 0,
      custom: { name: data.serialNumber },
      balances: { cashable: 0 },
      curProcess: { name: "", next: "" },
      tasks: {
        pendingHandpay: {
          name: "",
          steps: [],
          currentStepIndex: 0,
          retryAttempts: 0,
        },
      },
      origSerialNumber: "",
      machineId: "",
      gamingBoard: "",

      manuf: data.manufacturer || "",
      smibBoard: data.smibBoard,
      smibVersion: { firmware: "", version: "" },
      smibConfig: {
        mqtt: {
          mqttSecure: 0,
          mqttQOS: 0,
          mqttURI: "",
          mqttSubTopic: "",
          mqttPubTopic: "",
          mqttCfgTopic: "",
          mqttIdleTimeS: 0,
        },
        net: {
          netMode: 0,
          netStaSSID: "",
          netStaPwd: "",
          netStaChan: 0,
        },
        coms: {
          comsAddr: 0,
          comsMode: 0,
          comsRateMs: 0,
          comsRTE: 0,
          comsGPC: 0,
        },
        ota: {
          otaURL: "",
        },
      },
      sasMeters: {
        drop: 0,
        totalCancelledCredits: 0,
        gamesPlayed: 0,
        moneyOut: 0,
        slotDoorOpened: 0,
        powerReset: 0,
        totalHandPaidCancelledCredits: 0,
        coinIn: 0,
        coinOut: 0,
        totalWonCredits: 0,
        jackpot: 0,
        currentCredits: 0,
        gamesWon: 0,
      },
      billMeters: {
        dollar1: 0,
        dollar2: 0,
        dollar5: 0,
        dollar10: 0,
        dollar20: 0,
        dollar50: 0,
        dollar100: 0,
        dollar500: 0,
        dollar1000: 0,
        dollar2000: 0,
        dollar5000: 0,
        dollarTotal: 0,
        dollarTotalUnknown: 0,
      },
      operationsWhileIdle: { extendedMeters: new Date() },
      collectionMetersHistory: [],

      manufacturer: data.manufacturer || "",
      gameNumber: "",
      protocols: [],
      numberOfEnabledGames: 0,
      enabledGameNumbers: [],
      noOfGames: 0,
      viewingAccountDenomination: [],
      isSunBoxDevice: false,
      sessionHistory: [],
      currentSession: "",
      viewingAccountDenominationHistory: [],
      selectedDenomination: { drop: 0, totalCancelledCredits: 0 },
      lastBillMeterAt: new Date(),
      lastSasMeterAt: new Date(),
      machineType: "",
      machineStatus: "",
      lastMaintenanceDate: new Date(),
      nextMaintenanceDate: new Date(),
      maintenanceHistory: [],
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
      // Add the new fields from the schema
      collectorDenomination: 1, // Collection Report Multiplier as specified in prompt
    });

    await newMachine.save();

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [

          {
            field: "serialNumber",
            oldValue: null,
            newValue: data.serialNumber,
          },
          { field: "game", oldValue: null, newValue: data.game },
          {
            field: "gameType",
            oldValue: null,
            newValue: data.gameType || "slot",
          },
          {
            field: "isCronosMachine",
            oldValue: null,
            newValue: data.isCronosMachine,
          },
          { field: "cabinetType", oldValue: null, newValue: data.cabinetType },
          { field: "assetStatus", oldValue: null, newValue: data.assetStatus },
          {
            field: "gamingLocation",
            oldValue: null,
            newValue: data.gamingLocation,
          },
          { field: "smibBoard", oldValue: null, newValue: data.smibBoard },
          {
            field: "accountingDenomination",
            oldValue: null,
            newValue: data.accountingDenomination,
          },

          { field: "serialNumber", oldValue: null, newValue: data.serialNumber },
          { field: "game", oldValue: null, newValue: data.game },
          { field: "gameType", oldValue: null, newValue: data.gameType || "slot" },
          { field: "isCronosMachine", oldValue: null, newValue: data.isCronosMachine },
          { field: "cabinetType", oldValue: null, newValue: data.cabinetType },
          { field: "assetStatus", oldValue: null, newValue: data.assetStatus },
          { field: "gamingLocation", oldValue: null, newValue: data.gamingLocation },
          { field: "smibBoard", oldValue: null, newValue: data.smibBoard },
          { field: "accountingDenomination", oldValue: null, newValue: data.accountingDenomination },
        ];

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "CREATE",
          "machine",
          { id: machineId, name: data.serialNumber },
          createChanges,
          `Created new machine "${data.serialNumber}" with game "${data.game}"`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json({
      success: true,
      data: convertResponseToTrinidadTime(newMachine),
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

    // ID validation removed - _id is stored as String, not ObjectId

    const data = (await request.json()) as MachineUpdateData;


    // Backend validations mirroring frontend (only when provided)
    if (data.serialNumber !== undefined) {
      const serialNumberError = validateSerialNumber(data.serialNumber);
      if (serialNumberError) {
        return NextResponse.json(
          { success: false, error: serialNumberError },
          { status: 400 }
        );
      }
      data.serialNumber = normalizeSerialNumber(data.serialNumber);
    }

    if (data.smibBoard !== undefined) {
      const smibError = validateSmibBoard(data.smibBoard);
      if (smibError) {
        return NextResponse.json(
          { success: false, error: smibError },
          { status: 400 }
        );
      }
      data.smibBoard = normalizeSmibBoard(data.smibBoard) ?? "";
    }


    
    // Get original machine data for change tracking
    const originalMachine = await Machine.findById(id);
    if (!originalMachine) {
      return NextResponse.json(
        { success: false, error: "Cabinet not found" },
        { status: 404 }
      );
    }

    const updatedMachine = await Machine.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    // If serial number was updated, also update it in Collections
    if (data.serialNumber !== undefined && data.serialNumber !== "" && data.serialNumber !== originalMachine.serialNumber) {
      try {
        await Collections.updateMany(
          { machineId: id },
          { $set: { serialNumber: data.serialNumber } }
        );

        console.warn(
          `Updated serial number in Collections for machine ${id} from "${originalMachine.serialNumber}" to "${data.serialNumber}"`
        );
      } catch (collectionsError) {
        console.error("Failed to update serial number in Collections:", collectionsError);
        // Don't fail the entire operation if Collections update fails
      }
    }

    // If game name was updated, also update it in Collections
    if (data.game !== undefined && data.game !== "" && data.game !== originalMachine.game) {
      try {
        await Collections.updateMany(
          { machineId: id },
          { $set: { machineName: data.game } }
        );

        console.warn(
          `Updated machine name in Collections for machine ${id} from "${originalMachine.game}" to "${data.game}"`
        );
      } catch (collectionsError) {
        console.error("Failed to update machine name in Collections:", collectionsError);
        // Don't fail the entire operation if Collections update fails
      }
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const changes = calculateChanges(originalMachine.toObject(), data);

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "UPDATE",
          "machine",
          { id, name: originalMachine.serialNumber || originalMachine.game },
          changes,
          `Updated machine "${originalMachine.serialNumber || originalMachine.game}"`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json({
      success: true,
      data: convertResponseToTrinidadTime(updatedMachine),
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

    // ID validation removed - _id is stored as String, not ObjectId

    // Get machine data before deletion for logging
    const machineToDelete = await Machine.findById(id);
    if (!machineToDelete) {
      return NextResponse.json(
        { success: false, error: "Cabinet not found" },
        { status: 404 }
      );
    }

    await Machine.findByIdAndUpdate(id, {
      $set: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const deleteChanges = [

          {
            field: "serialNumber",
            oldValue: machineToDelete.serialNumber,
            newValue: null,
          },
          { field: "game", oldValue: machineToDelete.game, newValue: null },
          {
            field: "gameType",
            oldValue: machineToDelete.gameType,
            newValue: null,
          },
          {
            field: "isCronosMachine",
            oldValue: machineToDelete.isCronosMachine,
            newValue: null,
          },
          {
            field: "cabinetType",
            oldValue: machineToDelete.cabinetType,
            newValue: null,
          },
          {
            field: "assetStatus",
            oldValue: machineToDelete.assetStatus,
            newValue: null,
          },
          {
            field: "gamingLocation",
            oldValue: machineToDelete.gamingLocation,
            newValue: null,
          },
          {
            field: "smibBoard",
            oldValue: machineToDelete.smibBoard,
            newValue: null,
          },

          { field: "serialNumber", oldValue: machineToDelete.serialNumber, newValue: null },
          { field: "game", oldValue: machineToDelete.game, newValue: null },
          { field: "gameType", oldValue: machineToDelete.gameType, newValue: null },
          { field: "isCronosMachine", oldValue: machineToDelete.isCronosMachine, newValue: null },
          { field: "cabinetType", oldValue: machineToDelete.cabinetType, newValue: null },
          { field: "assetStatus", oldValue: machineToDelete.assetStatus, newValue: null },
          { field: "gamingLocation", oldValue: machineToDelete.gamingLocation, newValue: null },
          { field: "smibBoard", oldValue: machineToDelete.smibBoard, newValue: null },
        ];

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "DELETE",
          "machine",
          { id, name: machineToDelete.serialNumber || machineToDelete.game },
          deleteChanges,

          `Deleted machine "${machineToDelete.serialNumber || machineToDelete.game}"`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
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
