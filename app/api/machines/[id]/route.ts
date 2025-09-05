import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import { Meters } from "@/app/api/lib/models/meters";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";

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
    const timePeriod = searchParams.get("timePeriod") || "Today";

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

    // Fetch financial metrics from meters collection according to financial-metrics-guide.md
    const financialMetrics = await Meters.aggregate([
      {
        $match: {
          machine: id,
          readAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          sumDrop: { $sum: "$movement.drop" },
          sumOut: { $sum: "$movement.totalCancelledCredits" },
          sumJackpot: { $sum: "$movement.jackpot" },
          sumCancelledCredits: { $sum: "$movement.totalCancelledCredits" },
          sumCoinIn: { $sum: "$movement.coinIn" },
          sumCoinOut: { $sum: "$movement.coinOut" },
          sumGamesPlayed: { $sum: "$movement.gamesPlayed" },
          sumGamesWon: { $sum: "$movement.gamesWon" },
        },
      },
    ]);

    // Extract financial metrics or use defaults
    const metrics = financialMetrics[0] || {};
    const moneyIn = metrics.sumDrop || 0;
    const moneyOut = metrics.sumOut || 0;
    const gross = moneyIn - moneyOut;

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
      cancelledCredits: metrics.sumCancelledCredits || 0,
      jackpot: metrics.sumJackpot || 0,
      gross,
      // Additional metrics for comprehensive financial tracking
      coinIn: metrics.sumCoinIn || 0,
      coinOut: metrics.sumCoinOut || 0,
      gamesPlayed: metrics.sumGamesPlayed || 0,
      gamesWon: metrics.sumGamesWon || 0,
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
      manufacturer: machine.manufacturer,
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
