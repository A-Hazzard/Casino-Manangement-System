import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import type { GamingMachine } from "@/shared/types/entities";
type NewMachineData = Omit<GamingMachine, '_id' | 'createdAt' | 'updatedAt'> & {
  collectionSettings?: {
    lastCollectionTime?: string;
    lastMetersIn?: string;
    lastMetersOut?: string;
  };
};
import { generateMongoId } from "@/lib/utils/id";

/**
 * POST /api/locations/[locationId]/cabinets
 * Create a new machine/cabinet for a specific location
 */
export async function POST(request: NextRequest) {
  try {
    // Extract locationId from URL path
    const url = request.nextUrl;
    const locationId = url.pathname.split("/")[3]; // Extracts ID from /api/locations/[locationId]/cabinets

    console.warn(
      `POST request to create cabinet for location: ${locationId}`
    );

    // Location ID validation removed - _id is stored as String, not ObjectId

    const db = await connectDB();

    if (!db) {
      console.error("Failed to connect to the database");
      return NextResponse.json(
        { success: false, error: "Failed to connect to the database" },
        { status: 500 }
      );
    }

    // Verify location exists and is not deleted
    const location = await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    });
    if (!location) {
      console.warn(`Location not found or deleted with ID: ${locationId}`);
      return NextResponse.json(
        { success: false, error: "Location not found or has been deleted" },
        { status: 404 }
      );
    }

    // Parse the request data
    const data = (await request.json()) as NewMachineData;

    // Ensure we're using the location ID from the URL
    data.gamingLocation = locationId;

    // Generate a proper MongoDB ObjectId-style hex string for the machine
    const machineId = await generateMongoId();

    // Create the new machine
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
      gamingLocation: locationId, // Ensure location ID is set
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
      manuf: "",
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
      manufacturer: "",
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
    // console.log(`Cabinet created successfully with ID: ${newMachine._id}`);

    return NextResponse.json({
      success: true,
      data: newMachine,
    });
  } catch (error) {
    console.error("Error creating cabinet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create cabinet" },
      { status: 500 }
    );
  }
}
