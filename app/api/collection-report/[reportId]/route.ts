import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getCollectionReportById } from "@/app/api/lib/helpers/accountingDetails";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { Collections } from "@/app/api/lib/models/collections";
import { Machine } from "@/app/api/lib/models/machines";
import { logActivity } from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "../../lib/helpers/users";
import { getClientIP } from "@/lib/utils/ipAddress";
import type { CreateCollectionReportPayload } from "@/lib/types/api";

/**
 * API route handler for fetching a collection report by reportId.
 * @param request - The incoming request object.
 * @returns NextResponse with the collection report data or error message.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const reportId = request.nextUrl.pathname.split("/").pop();

    if (!reportId) {
      return NextResponse.json(
        { message: "Report ID is required" },
        { status: 400 }
      );
    }

    const reportData = await getCollectionReportById(reportId);
    if (!reportData) {
      return NextResponse.json(
        { message: "Collection Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error fetching collection report details:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * API route handler for updating a collection report by reportId.
 * @param request - The incoming request object.
 * @returns NextResponse with the updated collection report data or error message.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const reportId = request.nextUrl.pathname.split("/").pop();

    if (!reportId) {
      return NextResponse.json(
        { message: "Report ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json() as Partial<CreateCollectionReportPayload>;

    // Find the existing report
    const existingReport = await CollectionReport.findById(reportId);
    if (!existingReport) {
      return NextResponse.json(
        { message: "Collection Report not found" },
        { status: 404 }
      );
    }

    // Update the report
    const updatedReport = await CollectionReport.findByIdAndUpdate(
      reportId,
      { 
        ...body,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedReport) {
      return NextResponse.json(
        { message: "Failed to update collection report" },
        { status: 500 }
      );
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const updateChanges = Object.keys(body).map(key => ({
          field: key,
          oldValue: existingReport[key as keyof typeof existingReport],
          newValue: body[key as keyof typeof body]
        }));

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "UPDATE",
          "collection",
          { id: reportId, name: `${existingReport.locationName} - ${existingReport.collectorName}` },
          updateChanges,
          `Updated collection report for ${existingReport.locationName}`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json({ success: true, data: updatedReport });
  } catch (error) {
    console.error("Error updating collection report:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * API route handler for deleting a collection report by reportId.
 * This will also delete all associated collections and update machine collection history.
 * @param request - The incoming request object.
 * @returns NextResponse with success status or error message.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const reportId = request.nextUrl.pathname.split("/").pop();

    if (!reportId) {
      return NextResponse.json(
        { message: "Report ID is required" },
        { status: 400 }
      );
    }

    // Find the existing report to get details for logging
    const existingReport = await CollectionReport.findById(reportId);
    if (!existingReport) {
      return NextResponse.json(
        { message: "Collection Report not found" },
        { status: 404 }
      );
    }

    // Get all collections associated with this report
    const associatedCollections = await Collections.find({ locationReportId: reportId });
    
    // First, remove all collection history entries with this locationReportId from all machines
    // Handle both ObjectId and string types for _id in collectionMetersHistory
    try {
      // Try to remove by ObjectId first (new format)
      let updateResult = await Machine.updateMany(
        { "collectionMetersHistory.locationReportId": reportId },
        {
          $pull: {
            collectionMetersHistory: {
              locationReportId: reportId
            }
          },
          $set: {
            updatedAt: new Date()
          }
        }
      );
      
      // If no matches found with ObjectId, try with string _id (old format)
      if (updateResult.modifiedCount === 0) {
        updateResult = await Machine.updateMany(
          { "collectionMetersHistory._id": reportId },
          {
            $pull: {
              collectionMetersHistory: {
                _id: reportId
              }
            },
            $set: {
              updatedAt: new Date()
            }
          }
        );
      }
      
      console.warn(`Removed collection history entries from ${updateResult.modifiedCount} machines for reportId: ${reportId}`);
    } catch (historyError) {
      console.error(`Failed to remove collection history entries:`, historyError);
    }
    
    // Then revert collection meters for machines that had associated collections
    for (const collection of associatedCollections) {
      if (collection.machineId) {
        try {
          // Revert collection meters to previous values
          const machine = await Machine.findById(collection.machineId);
          
          if (machine && machine.collectionMeters) {
            // Revert metersIn and metersOut to previous values
            const previousMetersIn = collection.prevIn || 0;
            const previousMetersOut = collection.prevOut || 0;
            
            await Machine.findByIdAndUpdate(
              collection.machineId,
              {
                $set: {
                  "collectionMeters.metersIn": previousMetersIn,
                  "collectionMeters.metersOut": previousMetersOut,
                  updatedAt: new Date()
                }
              }
            );

            console.warn(`Reverted collection meters for machine ${collection.machineId}: metersIn=${previousMetersIn}, metersOut=${previousMetersOut}`);
          }
        } catch (revertError) {
          console.error(`Failed to revert collection meters for machine ${collection.machineId}:`, revertError);
          // Don't fail the entire operation if meter revert fails
        }
      }
    }

    // Delete all associated collections
    await Collections.deleteMany({ locationReportId: reportId });

    // Delete the collection report
    await CollectionReport.findByIdAndDelete(reportId);

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "DELETE",
          "collection",
          { id: reportId, name: `${existingReport.locationName} - ${existingReport.collectorName}` },
          [],
          `Deleted collection report for ${existingReport.locationName} with ${associatedCollections.length} associated collections. Collection meters reverted to previous values for all affected machines.`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Collection report and ${associatedCollections.length} associated collections deleted successfully. Collection meters reverted to previous values.` 
    });
  } catch (error) {
    console.error("Error deleting collection report:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
