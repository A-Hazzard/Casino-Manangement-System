import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import mongoose from "mongoose";
import { NewMachineData, MachineUpdateData } from "@/lib/types/machines";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Cabinet ID is required" },
        { status: 400 }
      );
    }

    // Use findOne with string _id
    const machine = await Machine.findOne({ _id: id });

    if (machine) {
      return NextResponse.json({
        success: true,
        data: machine,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Cabinet not found" },
        { status: 404 }
      );
    }
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
