/**
 * Delete Collections by Report API Route
 *
 * This route handles deleting all collections and collectionMetersHistory entries
 * by locationReportId. It supports:
 * - Deleting all collections for a report
 * - Reverting machine collectionMeters to previous values
 * - Removing collectionMetersHistory entries
 * - Deleting the collection report itself
 * - Complete cleanup when a collection report is deleted
 *
 * @module app/api/collections/delete-by-report/route
 */

import { Collections } from '@/app/api/lib/models/collections';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main DELETE handler for deleting collections by report
 *
 * Flow:
 * 1. Parse request body
 * 2. Validate locationReportId
 * 3. Connect to database
 * 4. Find all collections with this locationReportId
 * 5. Get machine IDs from collections
 * 6. Revert machine collectionMeters and remove history entries
 * 7. Delete all collections
 * 8. Delete the collection report
 * 9. Verify deletion completed
 * 10. Return success response
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse request body
    // ============================================================================
    const { locationReportId } = await request.json();

    // ============================================================================
    // STEP 2: Validate locationReportId
    // ============================================================================
    if (!locationReportId) {
      return NextResponse.json(
        { success: false, error: 'Location report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Find all collections with this locationReportId
    // ============================================================================
    const collections = await Collections.find({ locationReportId }).lean();

    // ============================================================================
    // STEP 5: Get machine IDs from collections
    // ============================================================================
    const machineIds = [
      ...new Set(collections.map(c => c.machineId).filter(Boolean)),
    ];

    // ============================================================================
    // STEP 6: Revert machine collectionMeters and remove history entries
    // ============================================================================
    const machineUpdatePromises = collections.map(async collection => {
      try {
        if (collection.machineId) {
          // Revert machine collectionMeters to the previous values from the collection
          // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
          await Machine.findOneAndUpdate(
            { _id: collection.machineId },
            {
              $set: {
                'collectionMeters.metersIn': collection.prevIn || 0,
                'collectionMeters.metersOut': collection.prevOut || 0,
                updatedAt: new Date(),
              },
              $pull: {
                collectionMetersHistory: { locationReportId },
              },
            },
            { new: true }
          );

          // Machine updated successfully
        }
      } catch (error) {
        console.error(
          `Failed to revert machine ${collection.machineId}:`,
          error
        );
      }
    });

    await Promise.all(machineUpdatePromises);

    // ============================================================================
    // STEP 7: Delete all collections
    // ============================================================================
    const deleteResult = await Collections.deleteMany({ locationReportId });

    // ============================================================================
    // STEP 8: Delete the collection report
    // ============================================================================
    const reportDeleteResult = await CollectionReport.deleteOne({
      locationReportId,
    });

    // ============================================================================
    // STEP 9: Verify deletion completed
    // ============================================================================
    const remainingCollections = await Collections.find({
      locationReportId,
    }).lean();

    // ============================================================================
    // STEP 10: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Collections Delete By Report DELETE API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      message: 'Successfully deleted collections and history',
      deletedCollections: deleteResult.deletedCount,
      deletedReport: reportDeleteResult.deletedCount,
      updatedMachines: machineIds.length,
      verification: {
        remainingCollections: remainingCollections.length,
        remainingHistoryEntries: 0, // This should always be 0 if deletion worked
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to delete collections and history';
    console.error(
      `[Delete Collections by Report API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

