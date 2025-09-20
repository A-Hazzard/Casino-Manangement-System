import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../lib/middleware/db";
import { Collections } from "@/app/api/lib/models/collections";
import { Machine } from "@/app/api/lib/models/machines";
import mongoose from "mongoose";

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

    // Update machine collectionMetersHistory if meters were updated
    if (updatedCollection.machineId && (updateData.metersIn !== undefined || updateData.metersOut !== undefined)) {
      try {
        // Get the current machine to access previous meters
        const currentMachine = await Machine.findById(updatedCollection.machineId).lean();
        if (currentMachine) {
          const currentMachineData = currentMachine as Record<string, unknown>;
          const currentCollectionMeters = currentMachineData.collectionMeters as { metersIn: number; metersOut: number } | undefined;
          
          // Check if there's already a history entry with the same locationReportId
          const existingHistoryEntry = (currentMachine as { collectionMetersHistory?: Array<{ locationReportId: string }> }).collectionMetersHistory?.find(
            (entry: { locationReportId: string }) => entry.locationReportId === updatedCollection.locationReportId
          );

          if (existingHistoryEntry) {
            // Update existing history entry
            await Machine.findByIdAndUpdate(
              updatedCollection.machineId,
              {
                $set: {
                  "collectionMeters.metersIn": updatedCollection.metersIn || 0,
                  "collectionMeters.metersOut": updatedCollection.metersOut || 0,
                  updatedAt: new Date(),
                  "collectionMetersHistory.$[elem].metersIn": updatedCollection.metersIn || 0,
                  "collectionMetersHistory.$[elem].metersOut": updatedCollection.metersOut || 0,
                  "collectionMetersHistory.$[elem].timestamp": new Date(),
                },
              },
              {
                arrayFilters: [{ "elem.locationReportId": updatedCollection.locationReportId }],
                new: true
              }
            );

            console.warn("Updated existing collectionMetersHistory entry:", {
              machineId: updatedCollection.machineId,
              locationReportId: updatedCollection.locationReportId,
              newMetersIn: updatedCollection.metersIn,
              newMetersOut: updatedCollection.metersOut,
            });
          } else {
            // Create new history entry if none exists
            const historyEntry = {
              _id: new mongoose.Types.ObjectId(),
              metersIn: updatedCollection.metersIn || 0,
              metersOut: updatedCollection.metersOut || 0,
              prevMetersIn: currentCollectionMeters?.metersIn || 0,
              prevMetersOut: currentCollectionMeters?.metersOut || 0,
              timestamp: new Date(),
              locationReportId: updatedCollection.locationReportId || "",
            };

            // Update machine collection meters and add to history
            await Machine.findByIdAndUpdate(
              updatedCollection.machineId,
              {
                $set: {
                  "collectionMeters.metersIn": updatedCollection.metersIn || 0,
                  "collectionMeters.metersOut": updatedCollection.metersOut || 0,
                  updatedAt: new Date(),
                },
                $push: {
                  collectionMetersHistory: historyEntry,
                },
              },
              { new: true }
            );

            console.warn("Added new collectionMetersHistory entry:", {
              machineId: updatedCollection.machineId,
              locationReportId: updatedCollection.locationReportId,
              newMetersIn: updatedCollection.metersIn,
              newMetersOut: updatedCollection.metersOut,
            });
          }
        }
      } catch (machineUpdateError) {
        console.error("Failed to update machine collection meters:", machineUpdateError);
        // Don't fail the collection update if machine update fails
      }
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
