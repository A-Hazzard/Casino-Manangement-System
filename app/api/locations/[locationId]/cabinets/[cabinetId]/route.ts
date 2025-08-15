import { NextResponse, NextRequest } from "next/server";
import { Machine } from "@/app/api/lib/models/machines";
import { Meters } from "@/app/api/lib/models/meters";
import { connectDB } from "../../../../lib/middleware/db";
import {
  MeterData,
  MongoQuery,
  MachineDocument,
  CabinetDetail,
  SasMeters,
} from "@/lib/types/mongo";

export async function GET(request: NextRequest) {
  try {
    // Extract parameters from the URL instead of context
    const url = request.nextUrl;
    const locationId = url.pathname.split("/")[3]; // Extract locationId from /api/locations/[locationId]/cabinets/[cabinetId]
    const cabinetId = url.pathname.split("/")[5]; // Extract cabinetId from /api/locations/[locationId]/cabinets/[cabinetId]

    await connectDB();

    // Try multiple approaches to find the cabinet
    // First attempt - standard query
    const standardQuery: MongoQuery = {
      _id: cabinetId,
      gamingLocation: locationId,
      deletedAt: { $in: [null, undefined] },
    };

    let machine = (await Machine.findOne(
      standardQuery
    ).lean()) as MachineDocument | null;

    // Second attempt - just by cabinet ID if first fails
    if (!machine) {
      const cabinetOnlyQuery: MongoQuery = {
        _id: cabinetId,
        deletedAt: { $in: [null, undefined] },
      };

      machine = (await Machine.findOne(
        cabinetOnlyQuery
      ).lean()) as MachineDocument | null;
    }

    // Third attempt - without deletedAt filter
    if (!machine) {
      const noDeletedAtQuery: MongoQuery = {
        _id: cabinetId,
      };

      machine = (await Machine.findOne(
        noDeletedAtQuery
      ).lean()) as MachineDocument | null;
    }

    if (!machine) {
      return NextResponse.json(
        { error: "Cabinet not found in this location" },
        { status: 404 }
      );
    }

    // Fetch the most recent meter data if available - silently
    const meterData = (await Meters.findOne({ machine: cabinetId })
      .sort({ readAt: -1 })
      .lean()) as MeterData | null;

    // Get sasMeters safely with proper typing
    const sasMeters = machine.sasMeters || {
      coinIn: 0,
      coinOut: 0,
      jackpot: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      currentCredits: 0,
    };

    // Create a complete cabinet detail object that includes all machine properties
    const cabinetDetail: CabinetDetail = {
      // Include the entire machine document
      ...machine,

      // Make sure these specific properties are defined with defaults if missing
      _id: machine._id,
      assetNumber: machine.serialNumber || "",
      serialNumber: machine.serialNumber || "",
      relayId: machine.relayId || "",
      smibBoard: machine.smibBoard || "",
      smbId: machine.smibBoard || machine.relayId || "",
      game: machine.game || "",
      installedGame: machine.game || "",
      cabinetType: machine.cabinetType || "",
      assetStatus: machine.assetStatus || "",
      status: machine.assetStatus || "",
      gamingLocation: machine.gamingLocation,
      lastActivity: machine.lastActivity,

      // Ensure sasMeters is properly defined - this is critical for the details page
      sasMeters: {
        coinIn: (sasMeters as SasMeters)?.coinIn || 0,
        coinOut: (sasMeters as SasMeters)?.coinOut || 0,
        drop: (sasMeters as SasMeters)?.drop || 0,
        jackpot: (sasMeters as SasMeters)?.jackpot || 0,
        gamesPlayed: (sasMeters as SasMeters)?.gamesPlayed || 0,
        gamesWon: (sasMeters as SasMeters)?.gamesWon || 0,
        currentCredits: (sasMeters as SasMeters)?.currentCredits || 0,
        totalCancelledCredits: (sasMeters as SasMeters)?.totalCancelledCredits || 0,
        ...(sasMeters as Record<string, unknown>),
      },

      // Include meter data if available
      meterData: meterData || null,

      // Make sure these are defined
      gameConfig: machine.gameConfig || {
        accountingDenomination: 0,
        theoreticalRtp: 0,
        maxBet: "",
        payTableId: "",
      },
      smibVersion: machine.smibVersion || {
        firmware: "",
        version: "",
      },
      collectionMeters: machine.collectionMeters || {
        metersIn: 0,
        metersOut: 0,
      },
      collectionMetersHistory: machine.collectionMetersHistory || [],
    };

    // Calculate financial metrics based on meter data or sasMeters
    if (meterData) {
      cabinetDetail.calculatedMetrics = {
        moneyIn:
          meterData.drop ||
          meterData.movement?.drop ||
          (sasMeters as SasMeters)?.drop ||
          0,
        moneyOut:
          meterData.totalCancelledCredits ||
          meterData.movement?.totalCancelledCredits ||
          (sasMeters as SasMeters)?.totalCancelledCredits ||
          0,
        jackpot:
          meterData.jackpot ||
          meterData.movement?.jackpot ||
          (sasMeters as SasMeters)?.jackpot ||
          0,
        cancelledCredits:
          meterData.totalCancelledCredits ||
          meterData.movement?.totalCancelledCredits ||
          0,
        gamesPlayed:
          meterData.gamesPlayed ||
          meterData.movement?.gamesPlayed ||
          (sasMeters as SasMeters)?.gamesPlayed ||
          0,
        gamesWon: meterData.gamesWon || (sasMeters as SasMeters)?.gamesWon || 0,
      };
    }

    return NextResponse.json(cabinetDetail);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch cabinet details" },
      { status: 500 }
    );
  }
}
