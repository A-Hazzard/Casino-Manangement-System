import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import mongoose from "mongoose";
import { NewMachineData } from "@/lib/types/machines";

/**
 * POST /api/locations/[locationId]/cabinets
 * Create a new machine/cabinet for a specific location
 */
export async function POST(request: NextRequest) {
  try {
    // Extract locationId from URL path
    const url = request.nextUrl;
    const locationId = url.pathname.split("/")[3]; // Extracts ID from /api/locations/[locationId]/cabinets

    // console.log(`🔍 POST request to create cabinet for location: ${locationId}`);

    const db = await connectDB();

    if (!db) {
      console.error("Failed to connect to the database");
      return NextResponse.json(
        { success: false, error: "Failed to connect to the database" },
        { status: 500 }
      );
    }

    // Verify location exists
    const location = await GamingLocations.findOne({ _id: locationId });
    if (!location) {
      // console.log(`❌ Location not found with ID: ${locationId}`);
      return NextResponse.json(
        { success: false, error: "Location not found" },
        { status: 404 }
      );
    }

    // Parse the request data
    const data = (await request.json()) as NewMachineData;

    // Ensure we're using the location ID from the URL
    data.gamingLocation = locationId;

    // Validate location ID
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return NextResponse.json(
        { success: false, error: "Invalid location ID format" },
        { status: 400 }
      );
    }



    // Create the new machine
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
      gamingLocation: locationId, // Ensure location ID is set
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
    // console.log(`✅ Cabinet created successfully with ID: ${newMachine._id}`);

    return NextResponse.json({
      success: true,
      data: newMachine,
    });
  } catch (error) {
    console.error("❌ Error creating cabinet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create cabinet" },
      { status: 500 }
    );
  }
}
