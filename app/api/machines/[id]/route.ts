import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import { Meters } from "@/app/api/lib/models/meters";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { trinidadTimeToUtc } from "../../lib/utils/timezone";

/**
 * GET /api/machines/[id]
 * Get a single machine by ID with transformed fields and financial metrics
 * Returns both active and soft-deleted machines
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get("timePeriod");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    
    console.warn("[DEBUG] API received parameters:", { id, timePeriod, startDateParam, endDateParam });
    
    // Only proceed if timePeriod or custom date range is provided
    if (!timePeriod && !startDateParam && !endDateParam) {
      return NextResponse.json(
        { error: "timePeriod or startDate/endDate parameters are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch machine with all necessary fields - INCLUDING soft-deleted ones
    const machine = await Machine.findOne({
      _id: id,
      // Removed: deletedAt: { $exists: false } because i want deleted docs,
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: "Machine not found" },
        { status: 404 }
      );
    }

    // Fetch location name if machine has a gamingLocation
    let locationName = "No Location Assigned";
    if (machine.gamingLocation) {
      try {
        const location = (await GamingLocations.findOne({
          _id: machine.gamingLocation,
        })
          .select("name locationName")
          .lean()) as {
          name?: string;
          locationName?: string;
        } | null;

        if (location) {
          locationName =
            location.name || location.locationName || "Unknown Location";
        } else {
          locationName = "Location Not Found";
        }
      } catch (error) {
        console.warn("Failed to fetch location name for machine:", error);
        locationName = "Location Error";
      }
    }

    // Calculate date range for time period filtering
    let startDate: Date, endDate: Date;
    const now = new Date();

    // Handle custom date range first
    if (startDateParam && endDateParam) {
      // Convert Trinidad time to UTC for database queries
      startDate = trinidadTimeToUtc(new Date(startDateParam));
      endDate = trinidadTimeToUtc(new Date(endDateParam));
    } else if (timePeriod) {
      // Handle predefined time periods
      switch (timePeriod) {
        case "Today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          );
          break;
        case "Yesterday":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1
          );
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case "All Time":
        default:
          startDate = new Date(0); // Beginning of time
          endDate = now;
          break;
      }
    } else {
      // Fallback to Today if no parameters provided
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
    }

    // Fetch financial metrics from meters collection using aggregation for date filtering
    console.warn("[DEBUG] Querying meters with date range:", { startDate, endDate });
    
    // Aggregate all meter readings within the specified date range
    const meterAggregation = await Meters.aggregate([
      {
        $match: {
          machine: id,
          readAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalMoneyIn: { $sum: "$movement.drop" },
          totalMoneyOut: { $sum: "$movement.totalCancelledCredits" },
          totalJackpot: { $sum: "$movement.jackpot" },
          totalCoinIn: { $sum: "$movement.coinIn" },
          totalCoinOut: { $sum: "$movement.coinOut" },
          totalGamesPlayed: { $sum: "$movement.gamesPlayed" },
          totalGamesWon: { $sum: "$movement.gamesWon" },
          count: { $sum: 1 }
        }
      }
    ]);

    console.warn("[DEBUG] Meter aggregation result:", meterAggregation);

    // Extract aggregated values
    const aggregatedData = meterAggregation[0] || {};
    const moneyIn = aggregatedData.totalMoneyIn || 0;
    const moneyOut = aggregatedData.totalMoneyOut || 0;
    const jackpot = aggregatedData.totalJackpot || 0;
    const coinIn = aggregatedData.totalCoinIn || 0;
    const coinOut = aggregatedData.totalCoinOut || 0;
    const gamesPlayed = aggregatedData.totalGamesPlayed || 0;
    const gamesWon = aggregatedData.totalGamesWon || 0;
    const gross = moneyIn - moneyOut;

    console.warn("[DEBUG] Calculated metrics:", { moneyIn, moneyOut, jackpot, coinIn, coinOut, gamesPlayed, gamesWon, gross });

    // Transform the data to match frontend expectations
    const transformedMachine = {
      _id: machine._id,
      assetNumber: machine.serialNumber || "",
      serialNumber: machine.serialNumber || "",
      installedGame: machine.game || "",
      game: machine.game || "",
      gamingLocation: machine.gamingLocation || "",
      locationId: machine.gamingLocation || "",
      locationName: locationName, // Add the resolved location name
      assetStatus: machine.assetStatus || "",
      status: machine.assetStatus || "",
      cabinetType: machine.cabinetType || "",
      smbId: machine.relayId || "",
      relayId: machine.relayId || "",
      accountingDenomination: machine.gameConfig?.accountingDenomination || "1",
      collectionMultiplier: machine.collectionMeters ? "1" : "1",
      isCronosMachine: false,
      createdAt: machine.createdAt,
      updatedAt: machine.updatedAt,
      deletedAt: machine.deletedAt, // Include deletedAt field
      // Financial metrics from meters collection according to financial-metrics-guide.md
      moneyIn,
      moneyOut,
      cancelledCredits: moneyOut, // Same as moneyOut (totalCancelledCredits)
      jackpot,
      gross,
      // Additional metrics for comprehensive financial tracking
      coinIn,
      coinOut,
      gamesPlayed,
      gamesWon,
      // Add handle (same as coinIn for betting activity)
      handle: coinIn,
      // SAS meters fallback
      sasMeters: machine.sasMeters || {},
      // Collection meters
      collectionMeters: machine.collectionMeters || {},
      // Include all the missing fields from the database
      collectionMetersHistory: machine.collectionMetersHistory || [],
      billValidator: machine.billValidator || {},
      smibConfig: machine.smibConfig || {},
      smibVersion: machine.smibVersion || {},
      billMeters: machine.billMeters || {},
      lastActivity: machine.lastActivity,
      sessionHistory: machine.sessionHistory || [],
      balances: machine.balances || {},
      tasks: machine.tasks || {},
      curProcess: machine.curProcess || {},
      protocols: machine.protocols || [],
      manufacturer: machine.manufacturer || machine.manuf,
      validationId: machine.validationId,
      sequenceNumber: machine.sequenceNumber,
      isSasMachine: machine.isSasMachine,
      lastBillMeterAt: machine.lastBillMeterAt,
      lastSasMeterAt: machine.lastSasMeterAt,
      collectionTime: machine.collectionTime,
      previousCollectionTime: machine.previousCollectionTime,
      operationsWhileIdle: machine.operationsWhileIdle || {},
      viewingAccountDenominationHistory:
        machine.viewingAccountDenominationHistory || [],
      custom: machine.custom || {},
      isSunBoxDevice: machine.isSunBoxDevice,
      playableBalance: machine.playableBalance,
      config: machine.config || {},
      gamingBoard: machine.gamingBoard,
      manuf: machine.manuf,
      gameConfig: machine.gameConfig || {},
      origSerialNumber: machine.origSerialNumber,
      machineId: machine.machineId,
      gameNumber: machine.gameNumber,
      numberOfEnabledGames: machine.numberOfEnabledGames,
      enabledGameNumbers: machine.enabledGameNumbers || [],
      noOfGames: machine.noOfGames,
      viewingAccountDenomination: machine.viewingAccountDenomination || [],
      currentSession: machine.currentSession,
      orig: machine.orig || {},
    };

    return NextResponse.json({
      success: true,
      data: transformedMachine,
    });
  } catch (error) {
    console.error("❌ Error fetching machine:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch machine" },
      { status: 500 }
    );
  }
}

export function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
