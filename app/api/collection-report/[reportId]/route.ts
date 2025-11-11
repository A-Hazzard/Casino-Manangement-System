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
  // 🔍 PERFORMANCE: Start overall timer
  const perfStart = Date.now();
  
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

    // Ensure collectionDate is always present (fallback to timestamp if missing)
    if (!reportData.collectionDate) {
      const report = await CollectionReport.findOne({
        locationReportId: reportId,
      });
      if (report?.timestamp) {
        reportData.collectionDate = new Date(report.timestamp).toISOString();
      }
    }

    const totalTime = Date.now() - perfStart;
    console.log(
      `[COLLECTION REPORT DETAILS] ⚡ Fetched report ${reportId} in ${totalTime}ms | ` +
      `Machines: ${reportData.machineMetrics?.length || 0}`
    );

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

    const body =
      (await request.json()) as Partial<CreateCollectionReportPayload>;

    // Find the existing report
    // CRITICAL: Use findOne since _id is String type, not ObjectId
    const existingReport = await CollectionReport.findOne({ _id: reportId });
    if (!existingReport) {
      return NextResponse.json(
        { message: "Collection Report not found" },
        { status: 404 }
      );
    }

    // Check if timestamp is being changed
    const isTimestampChanged =
      body.timestamp &&
      new Date(body.timestamp).getTime() !== existingReport.timestamp.getTime();

    // Update the report
    // CRITICAL: Use findOneAndUpdate since _id is String type, not ObjectId
    const updatedReport = await CollectionReport.findOneAndUpdate(
      { _id: reportId },
      {
        ...body,
        isEditing: false, // Mark as NOT editing when report is finalized with "Update Report"
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedReport) {
      return NextResponse.json(
        { message: "Failed to update collection report" },
        { status: 500 }
      );
    }

    // If timestamp changed, update all related collections and machines
    if (isTimestampChanged) {
      try {
        const newTimestamp = new Date(body.timestamp!);

        // Update all collections for this report
        const collections = await Collections.find({
          locationReportId: reportId,
        });

        for (const collection of collections) {
          // Update collection timestamp
          await Collections.findByIdAndUpdate(collection._id, {
            timestamp: newTimestamp,
            updatedAt: new Date(),
          });

          // Update machine collection times
          if (collection.machineId) {
            const machine = await Machine.findById(collection.machineId);
            if (machine) {
              // Update collectionTime to new timestamp
              await Machine.findByIdAndUpdate(collection.machineId, {
                collectionTime: newTimestamp,
                previousCollectionTime: machine.collectionTime, // Move current to previous
                updatedAt: new Date(),
              });
            }
          }
        }

        // Update gaming location's previousCollectionTime if this is the latest report
        if (updatedReport.location) {
          // Find the most recent report for this location
          const latestReport = await CollectionReport.findOne({
            location: updatedReport.location,
          }).sort({ timestamp: -1 });

          // If this is the latest report, update the gaming location
          if (latestReport && latestReport._id.toString() === reportId) {
            const GamingLocations = (
              await import("@/app/api/lib/models/gaminglocations")
            ).GamingLocations;
            await GamingLocations.findByIdAndUpdate(updatedReport.location, {
              previousCollectionTime: newTimestamp,
              updatedAt: new Date(),
            });
          }
        }

        console.warn(
          `Updated timestamp for report ${reportId} and ${collections.length} collections`
        );
      } catch (error) {
        console.error(
          "Error updating related data after timestamp change:",
          error
        );
        // Don't fail the request, just log the error
      }
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const updateChanges = Object.keys(body).map((key) => ({
          field: key,
          oldValue: existingReport[key as keyof typeof existingReport],
          newValue: body[key as keyof typeof body],
        }));

        await logActivity({
          action: "UPDATE",
          details: `Updated collection report for ${existingReport.locationName}`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get("user-agent") || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || "user",
            resource: "collection",
            resourceId: reportId,
            resourceName: `${existingReport.locationName} - ${existingReport.collectorName}`,
            changes: updateChanges,
          },
        });
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
    const associatedCollections = await Collections.find({
      locationReportId: reportId,
    });

    // First, remove all collection history entries with this locationReportId from all machines
    // Handle both ObjectId and string types for _id in collectionMetersHistory
    try {
      // Try to remove by ObjectId first (new format)
      let updateResult = await Machine.updateMany(
        { "collectionMetersHistory.locationReportId": reportId },
        {
          $pull: {
            collectionMetersHistory: {
              locationReportId: reportId,
            },
          },
          $set: {
            updatedAt: new Date(),
          },
        }
      );

      // If no matches found with ObjectId, try with string _id (old format)
      if (updateResult.modifiedCount === 0) {
        updateResult = await Machine.updateMany(
          { "collectionMetersHistory._id": reportId },
          {
            $pull: {
              collectionMetersHistory: {
                _id: reportId,
              },
            },
            $set: {
              updatedAt: new Date(),
            },
          }
        );
      }

      console.warn(
        `Removed collection history entries from ${updateResult.modifiedCount} machines for reportId: ${reportId}`
      );
    } catch (historyError) {
      console.error(
        `Failed to remove collection history entries:`,
        historyError
      );
    }

    // Then revert collection meters for machines that had associated collections
    for (const collection of associatedCollections) {
      if (collection.machineId) {
        try {
          // Find the actual previous collection to get correct revert values
          // Don't use collection.prevIn/prevOut as they might be incorrect (e.g., 0)
          const actualPreviousCollection = await Collections.findOne({
            machineId: collection.machineId,
            $and: [
              {
                $or: [
                  { collectionTime: { $lt: collection.collectionTime || collection.timestamp } },
                  { timestamp: { $lt: collection.collectionTime || collection.timestamp } },
                ],
              },
              {
                $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
              },
              // Only look for completed collections (from finalized reports)
              { isCompleted: true },
            ],
          })
            .sort({ collectionTime: -1, timestamp: -1 })
            .lean();

          let revertToMetersIn = 0;
          let revertToMetersOut = 0;

          if (actualPreviousCollection) {
            // Use the actual previous collection's metersIn/metersOut
            revertToMetersIn = actualPreviousCollection.metersIn || 0;
            revertToMetersOut = actualPreviousCollection.metersOut || 0;
            
            console.warn(
              `Found actual previous collection for machine ${collection.machineId}:`,
              {
                previousCollectionId: actualPreviousCollection._id,
                previousTimestamp: actualPreviousCollection.timestamp,
                revertToMetersIn,
                revertToMetersOut,
              }
            );
          } else {
            // No previous collection found, revert to 0
            console.warn(
              `No previous collection found for machine ${collection.machineId}, reverting to 0`
            );
          }

          await Machine.findByIdAndUpdate(collection.machineId, {
            $set: {
              "collectionMeters.metersIn": revertToMetersIn,
              "collectionMeters.metersOut": revertToMetersOut,
              updatedAt: new Date(),
            },
          });

          console.warn(
            `Reverted collection meters for machine ${collection.machineId}: metersIn=${revertToMetersIn}, metersOut=${revertToMetersOut}`
          );
        } catch (revertError) {
          console.error(
            `Failed to revert collection meters for machine ${collection.machineId}:`,
            revertError
          );
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
        await logActivity({
          action: "DELETE",
          details: `Deleted collection report for ${existingReport.locationName} with ${associatedCollections.length} associated collections. Collection meters reverted to previous values for all affected machines.`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get("user-agent") || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || "user",
            resource: "collection",
            resourceId: reportId,
            resourceName: `${existingReport.locationName} - ${existingReport.collectorName}`,
            changes: [],
          },
        });
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Collection report and ${associatedCollections.length} associated collections deleted successfully. Collection meters reverted to previous values.`,
    });
  } catch (error) {
    console.error("Error deleting collection report:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
