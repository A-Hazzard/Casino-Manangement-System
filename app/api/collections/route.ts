import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Collections } from "@/app/api/lib/models/collections";
import { Machine } from "@/app/api/lib/models/machines";
import { generateMongoId } from "@/lib/utils/id";
import { createCollectionWithCalculations } from "@/lib/helpers/collectionCreation";
import type {
  CollectionDocument,
  CreateCollectionPayload,
} from "@/lib/types/collections";

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const locationReportId = searchParams.get("locationReportId");
    const location = searchParams.get("location");
    const collector = searchParams.get("collector");
    const isCompleted = searchParams.get("isCompleted");
    const filter: Record<string, unknown> = {};
    if (locationReportId) filter.locationReportId = locationReportId;
    if (location) filter.location = location;
    if (collector) filter.collector = collector;
    if (isCompleted !== null && isCompleted !== undefined)
      filter.isCompleted = isCompleted === "true";
    const collections = (await Collections.find(
      filter
    ).lean()) as CollectionDocument[];
    return NextResponse.json(collections);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const payload: CreateCollectionPayload = await req.json();

    // Validate required fields
    if (!payload.machineId || !payload.location || !payload.collector) {
      return NextResponse.json(
        { error: "Missing required fields: machineId, location, collector" },
        { status: 400 }
      );
    }

    if (
      typeof payload.metersIn !== "number" ||
      typeof payload.metersOut !== "number"
    ) {
      return NextResponse.json(
        { error: "metersIn and metersOut must be valid numbers" },
        { status: 400 }
      );
    }

    // Get machine details for additional fields
    const machine = await Machine.findById(payload.machineId).lean();
    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    // Safely access machine properties with type assertion
    const machineData = machine as Record<string, unknown>;

    // Calculate SAS metrics, movement, and update machine
    const { sasMeters, movement, previousMeters } =
      await createCollectionWithCalculations(payload);

    // Create collection document with all calculated fields
    const collectionData = {
      _id: await generateMongoId(),
      isCompleted: payload.isCompleted ?? false,
      metersIn: payload.metersIn,
      metersOut: payload.metersOut,
      prevIn: previousMeters.metersIn,
      prevOut: previousMeters.metersOut,
      softMetersIn: 0,
      softMetersOut: 0,
      notes: payload.notes || "",
      timestamp: new Date(),
      location: payload.location,
      collector: payload.collector,
      locationReportId: payload.locationReportId || "",
      sasMeters: {
        machine:
          (machineData.serialNumber as string) ||
          (machineData.customName as string) ||
          payload.machineId,
        drop: sasMeters.drop,
        totalCancelledCredits: sasMeters.totalCancelledCredits,
        gross: sasMeters.gross,
        gamesPlayed: sasMeters.gamesPlayed,
        jackpot: sasMeters.jackpot,
        sasStartTime: sasMeters.sasStartTime,
        sasEndTime: sasMeters.sasEndTime,
      },
      movement: {
        metersIn: movement.metersIn,
        metersOut: movement.metersOut,
        gross: movement.gross,
      },
      machineCustomName:
        payload.machineCustomName ||
        (machineData.customName as string) ||
        (machineData.serialNumber as string) ||
        "Unknown Machine",
      machineId: payload.machineId,
      machineName:
        payload.machineName ||
        (machineData.customName as string) ||
        (machineData.serialNumber as string) ||
        "Unknown Machine",
      serialNumber:
        payload.serialNumber || (machineData.serialNumber as string) || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create the collection
    const created = await Collections.create(collectionData);

    // Collection created successfully

    return NextResponse.json({
      success: true,
      data: created,
      calculations: {
        sasMeters,
        movement,
        previousMeters,
      },
    });
  } catch (error) {
    console.error("❌ Error creating collection:", error);
    return NextResponse.json(
      {
        error: "Failed to create collection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const updateData = await req.json();
    const updated = await Collections.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to update collection", details: (e as Error)?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const deleted = await Collections.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to delete collection", details: (e as Error)?.message },
      { status: 500 }
    );
  }
}
