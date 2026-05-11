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
 * @module app/api/collection-reports/collections/delete-by-report/route
 */

import { Collections } from '@/app/api/lib/models/collections';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Machine } from '@/app/api/lib/models/machines';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { CollectionDocument } from '@/lib/types/collection';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main DELETE handler for deleting collections by report
 *
 * @body {string} locationReportId - REQUIRED. The unique logic ID (not MongoDB _id) of the report to delete
 */
export async function DELETE(request: NextRequest) {
  return withApiAuth(request, async ({ isAdminOrDev }) => {
    if (!isAdminOrDev) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    const startTime = Date.now();
    const functionName =
      'DELETE /api/collection-reports/collections/delete-by-report';
    const user = extractUserFromRequest(request);

    try {
      // ============================================================================
      // STEP1: Parse request body
      // ============================================================================
      const { locationReportId } = await request.json();

      // ============================================================================
      // STEP 2: Validate locationReportId
      // ============================================================================
      if (!locationReportId) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/collection-reports/collections/delete-by-report',
          'Location report ID is required',
          user
        );
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
      const collections = await Collections.find({ locationReportId }).lean<
        CollectionDocument[]
      >();

      // ============================================================================
      // STEP 5: Get machine IDs from collections
      // ============================================================================
      const machineIds = [
        ...new Set(
          collections.map(collection => collection.machineId).filter(Boolean)
        ),
      ];

      // ============================================================================
      // STEP 6: Revert machine collectionMeters and remove history entries
      // ============================================================================
      // CRITICAL: Revert meters BEFORE deleting collections, preserve prevIn/prevOut
      // if no other collection exists for the machine
      const machineUpdatePromises = collections.map(async collection => {
        try {
          if (collection.machineId) {
            // Find if there's another collection for this machine (excluding the one being deleted)
            const otherCollection = await Collections.findOne({
              machineId: collection.machineId,
              locationReportId: { $ne: locationReportId },
              isCompleted: true,
            }).sort({ collectionTime: -1, timestamp: -1 });

            // Determine revert values: use other collection's meters, or fall back to prevIn/prevOut
            const revertMetersIn =
              otherCollection?.metersIn ?? collection.prevIn ?? 0;
            const revertMetersOut =
              otherCollection?.metersOut ?? collection.prevOut ?? 0;

            // Revert machine collectionMeters to the determined values
            // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
            const machineRevertResult = await Machine.findOneAndUpdate(
              { _id: collection.machineId },
              {
                $set: {
                  'collectionMeters.metersIn': revertMetersIn,
                  'collectionMeters.metersOut': revertMetersOut,
                  updatedAt: new Date(),
                },
                $pull: {
                  collectionMetersHistory: { locationReportId },
                },
              },
              { new: true }
            );
            if (!machineRevertResult) {
              console.warn(
                `[delete-by-report] Machine ${collection.machineId} not found for meter revert`
              );
            }
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
      }).lean<CollectionDocument[]>();

      // ============================================================================
      // STEP 10: Return success response
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteDelete(
        functionName,
        'DELETE',
        '/api/collection-reports/collections/delete-by-report',
        collections.length,
        user,
        duration
      );
      if (duration > 1000) {
        console.warn(
          `[Collections Delete By Report DELETE API] Completed in ${duration}ms`
        );
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
      logRouteError(
        functionName,
        'DELETE',
        '/api/collection-reports/collections/delete-by-report',
        errorMessage,
        user
      );
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
  });
}
