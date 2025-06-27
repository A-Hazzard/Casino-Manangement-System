import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../lib/middleware/db";
import { Collections } from "../../lib/models/collections";
import { Meter } from "../../lib/models/meters";

/**
 * POST /api/collection-report/sync-meters
 * Recalculates SAS metrics for collections based on meter data within SAS time periods
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: "Report ID is required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting sync for report: ${reportId}`);

    // Get all collections for this report
    const collections = await Collections.find({
      locationReportId: reportId,
    });

    if (collections.length === 0) {
      return NextResponse.json(
        { success: false, error: "No collections found for this report" },
        { status: 404 }
      );
    }

    let updatedCollections = 0;
    const results = [];

    // Process each collection
    for (const collection of collections) {
      const machineId = collection.machineId;

      if (!machineId) {
        console.log(`⚠️ Skipping collection ${collection._id}: No machine ID`);
        continue;
      }

      // Get SAS time period for this collection
      const sasStartTime = collection.sasMeters?.sasStartTime
        ? new Date(collection.sasMeters.sasStartTime)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24 hours ago

      const sasEndTime = collection.sasMeters?.sasEndTime
        ? new Date(collection.sasMeters.sasEndTime)
        : new Date(); // Default to current time

      console.log(
        `🔍 Processing machine ${machineId} for period: ${sasStartTime.toISOString()} to ${sasEndTime.toISOString()}`
      );

      // Get meter data within the SAS time period
      const metersInPeriod = await Meter.find({
        machine: machineId,
        readAt: { $gte: sasStartTime, $lte: sasEndTime },
      }).sort({ readAt: 1 }); // Sort ascending to get chronological order

      if (metersInPeriod.length === 0) {
        console.log(
          `⚠️ No meters found for machine ${machineId} in the specified period`
        );
        continue;
      }

      // Calculate totals from meter data within the period
      const totalDrop = metersInPeriod.reduce((sum, meter) => {
        return sum + (meter.movement?.drop || 0);
      }, 0);

      const totalCancelledCredits = metersInPeriod.reduce((sum, meter) => {
        return sum + (meter.movement?.totalCancelledCredits || 0);
      }, 0);

      const sasGross = totalDrop - totalCancelledCredits;

      // Update the collection's sasMeters
      const updateResult = await Collections.updateOne(
        { _id: collection._id },
        {
          $set: {
            "sasMeters.drop": totalDrop,
            "sasMeters.totalCancelledCredits": totalCancelledCredits,
            "sasMeters.gross": sasGross,
            "sasMeters.sasStartTime": sasStartTime.toISOString(),
            "sasMeters.sasEndTime": sasEndTime.toISOString(),
          },
        }
      );

      if (updateResult.modifiedCount > 0) {
        updatedCollections++;
        results.push({
          machineId,
          collectionId: collection._id,
          metersProcessed: metersInPeriod.length,
          calculatedValues: {
            drop: totalDrop,
            totalCancelledCredits,
            gross: sasGross,
          },
          timePeriod: {
            start: sasStartTime.toISOString(),
            end: sasEndTime.toISOString(),
          },
        });

        console.log(
          `✅ Updated collection ${collection._id} for machine ${machineId}:`,
          {
            drop: totalDrop,
            cancelled: totalCancelledCredits,
            gross: sasGross,
            metersProcessed: metersInPeriod.length,
          }
        );
      }
    }

    console.log(
      `✅ Sync completed successfully. Updated ${updatedCollections} collections out of ${collections.length}`
    );

    return NextResponse.json({
      success: true,
      data: {
        reportId,
        totalCollections: collections.length,
        updatedCollections,
        results,
      },
    });
  } catch (error) {
    console.error("❌ Error syncing meter data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
