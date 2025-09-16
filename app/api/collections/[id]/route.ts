import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../lib/middleware/db";
import { Collections } from "@/app/api/lib/models/collections";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params;
    const updateData = await request.json();

    // Debug: Log what data we're receiving
    console.warn("🔍 API RECEIVED UPDATE DATA:", {
      collectionId,
      updateDataKeys: Object.keys(updateData),
      hasIdInUpdateData: "_id" in updateData,
      updateData: updateData,
    });

    if (!collectionId) {
      return NextResponse.json(
        { success: false, error: "Collection ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Safety check: Remove _id field if present (it's immutable)
    const { _id, ...safeUpdateData } = updateData as Record<string, unknown>;
    if ("_id" in updateData) {
      console.warn("⚠️ API: Removed _id field from update data");
    }

    // Find and update the collection
    const updatedCollection = await Collections.findByIdAndUpdate(
      collectionId,
      {
        ...safeUpdateData,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedCollection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    console.warn("Collection updated successfully:", {
      collectionId,
      updatedFields: Object.keys(updateData),
      newMetersIn: updatedCollection.metersIn,
      newMetersOut: updatedCollection.metersOut,
    });

    return NextResponse.json({
      success: true,
      message: "Collection updated successfully",
      data: updatedCollection,
    });
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
