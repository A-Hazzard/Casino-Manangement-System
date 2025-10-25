import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';
import { Collections } from '../../../lib/models/collections';
import { CollectionReport } from '../../../lib/models/collectionReport';
import { Meters } from '../../../lib/models/meters';

/**
 * POST /api/collection-report/[reportId]/sync-meters
 * Recalculates SAS metrics for collections based on meter data within SAS time periods
 * Following the specified flow:
 * 1. Find collection report by locationReportId
 * 2. Find all collections for this report
 * 3. For each collection: get machine data, determine SAS period, fetch meters, calculate movement, update collection
 * 4. Update collection report totals
 * 5. Return success with statistics
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    await connectDB();

    const { reportId } = await params;

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Step 1: Find collection report by locationReportId
    const collectionReport = await CollectionReport.findOne({
      locationReportId: reportId,
    });

    if (!collectionReport) {
      return NextResponse.json(
        { success: false, error: 'Collection report not found' },
        { status: 404 }
      );
    }

    // Step 2: Find all collections for this report
    const collections = await Collections.find({
      locationReportId: reportId,
    });

    if (collections.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No collections found for this report' },
        { status: 404 }
      );
    }

    let updatedCollections = 0;
    const results = [];
    let reportTotalDrop = 0;
    let reportTotalCancelled = 0;
    let reportTotalGross = 0;

    // Step 3: Process each collection
    for (const collection of collections) {
      const machineId = collection.machineId;

      if (!machineId) {
        console.warn(`⚠️ Skipping collection ${collection._id}: No machine ID`);
        continue;
      }

      // Step 3b: Determine SAS time period for this collection
      const sasStartTime = collection.sasMeters?.sasStartTime
        ? new Date(collection.sasMeters.sasStartTime)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24 hours ago

      const sasEndTime = collection.sasMeters?.sasEndTime
        ? new Date(collection.sasMeters.sasEndTime)
        : new Date(); // Default to current time

      // Step 3c: Fetch ALL meters within SAS period
      const metersInPeriod = await Meters.find({
        machine: machineId,
        readAt: { $gte: sasStartTime, $lte: sasEndTime },
      }).sort({ readAt: 1 }); // Sort ascending to get chronological order

      if (metersInPeriod.length === 0) {
        console.warn(
          `⚠️ No meters found for machine ${machineId} in the specified period`
        );
        continue;
      }

      // Step 3d: Calculate movement (first→last meter)
      const firstMeter = metersInPeriod[0];
      const lastMeter = metersInPeriod[metersInPeriod.length - 1];

      const dropMovement =
        (lastMeter.movement?.drop || 0) - (firstMeter.movement?.drop || 0);
      const cancelledMovement =
        (lastMeter.movement?.totalCancelledCredits || 0) -
        (firstMeter.movement?.totalCancelledCredits || 0);
      const sasGross = dropMovement - cancelledMovement;

      // Use movement calculation as primary method
      const finalDrop = dropMovement;
      const finalCancelled = cancelledMovement;
      const finalGross = sasGross;

      // Step 3f: Update collection with new data
      const updateResult = await Collections.updateOne(
        { _id: collection._id },
        {
          $set: {
            'sasMeters.drop': finalDrop,
            'sasMeters.totalCancelledCredits': finalCancelled,
            'sasMeters.gross': finalGross,
            'sasMeters.sasStartTime': sasStartTime.toISOString(),
            'sasMeters.sasEndTime': sasEndTime.toISOString(),
          },
        }
      );

      // Step 3g: Update machine collection meters (if needed)
      // This could involve updating the machine's collectionMetersHistory
      // Implementation depends on your specific requirements

      if (updateResult.modifiedCount > 0) {
        updatedCollections++;

        // Add to report totals
        reportTotalDrop += finalDrop;
        reportTotalCancelled += finalCancelled;
        reportTotalGross += finalGross;

        results.push({
          machineId,
          collectionId: collection._id,
          metersProcessed: metersInPeriod.length,
          calculatedValues: {
            drop: finalDrop,
            totalCancelledCredits: finalCancelled,
            gross: finalGross,
          },
          movementCalculation: {
            firstMeter: {
              drop: firstMeter.movement?.drop || 0,
              cancelled: firstMeter.movement?.totalCancelledCredits || 0,
              readAt: firstMeter.readAt,
            },
            lastMeter: {
              drop: lastMeter.movement?.drop || 0,
              cancelled: lastMeter.movement?.totalCancelledCredits || 0,
              readAt: lastMeter.readAt,
            },
            movement: {
              drop: dropMovement,
              cancelled: cancelledMovement,
            },
          },
          timePeriod: {
            start: sasStartTime.toISOString(),
            end: sasEndTime.toISOString(),
          },
        });
      }
    }

    // Step 4: Update collection report totals
    if (updatedCollections > 0) {
      await CollectionReport.updateOne(
        { locationReportId: reportId },
        {
          $set: {
            totalDrop: reportTotalDrop,
            totalCancelled: reportTotalCancelled,
            totalGross: reportTotalGross,
            totalSasGross: reportTotalGross,
            lastSyncedAt: new Date(),
          },
        }
      );
    }

    // Step 5: Return success with statistics
    return NextResponse.json({
      success: true,
      data: {
        reportId,
        totalCollections: collections.length,
        updatedCollections,
        reportTotals: {
          totalDrop: reportTotalDrop,
          totalCancelled: reportTotalCancelled,
          totalGross: reportTotalGross,
        },
        results,
      },
    });
  } catch (error) {
    console.error(' Error syncing meter data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
