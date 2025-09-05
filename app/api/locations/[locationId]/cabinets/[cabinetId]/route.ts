import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";

/**
 * GET /api/locations/[locationId]/cabinets/[cabinetId]
 * Get a specific cabinet by ID within a location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    // Verify location exists and is not deleted
    const location = await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    });
    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location not found or has been deleted" },
        { status: 404 }
      );
    }

    // Fetch the specific cabinet
    const cabinet = await Machine.findOne({
      _id: cabinetId,
      gamingLocation: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    });

    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: "Cabinet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cabinet,
    });
  } catch (error) {
    console.error("Error fetching cabinet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cabinet" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/locations/[locationId]/cabinets/[cabinetId]
 * Update a specific cabinet by ID within a location
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    // Verify location exists and is not deleted
    const location = await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    });
    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location not found or has been deleted" },
        { status: 404 }
      );
    }

    // Parse the request data
    const data = await request.json();

    // Transform frontend field names back to database field names
    const transformedData = {
      serialNumber: data.assetNumber || data.serialNumber,
      game: data.installedGame || data.game,
      relayId: data.smbId || data.relayId,
      assetStatus: data.status || data.assetStatus,
      cabinetType: data.cabinetType,
      // Handle nested fields
      gameConfig: {
        accountingDenomination: data.accountingDenomination
          ? Number(data.accountingDenomination)
          : undefined,
      },
      // Add other fields as needed
      updatedAt: new Date(),
    };

    // Update the machine
    const updatedMachine = await Machine.findByIdAndUpdate(
      cabinetId,
      transformedData,
      { new: true, runValidators: true }
    );

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: "Machine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMachine,
    });
  } catch (error) {
    console.error("Error updating cabinet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update cabinet" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[locationId]/cabinets/[cabinetId]
 * Delete a specific cabinet by ID within a location
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    // Verify location exists and is not deleted
    const location = await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    });
    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location not found or has been deleted" },
        { status: 404 }
      );
    }

    // Soft delete the machine by setting deletedAt
    const deletedMachine = await Machine.findByIdAndUpdate(
      cabinetId,
      {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!deletedMachine) {
      return NextResponse.json(
        { success: false, error: "Machine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedMachine,
    });
  } catch (error) {
    console.error("Error deleting cabinet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete cabinet" },
      { status: 500 }
    );
  }
}
