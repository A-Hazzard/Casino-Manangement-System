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
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import {
  logActivity,
  mapDeletedFieldsToChanges,
} from '@/app/api/lib/helpers/activityLogger';
import { getClientIP } from '@/lib/utils/ipAddress';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
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
      // STEP 1: Parse request body
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
      // STEP 6: Delete associated manual meters
      // ============================================================================
      const { deleteManualMetersPerCollection } =
        await import('@/app/api/lib/helpers/collectionReport/operations');
      await deleteManualMetersPerCollection(locationReportId, false);

      // ============================================================================
      // STEP 6.5: Fetch collection report before deleting
      // ============================================================================
      const existingReport = await CollectionReport.findOne({
        locationReportId,
      }).lean();

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
      // STEP 8.7: Propagate deletion forward and recalculate machines
      // ============================================================================
      const { updateRegularAndRamClearMeters } =
        await import('@/app/api/lib/helpers/collectionReport/reportCreation');
      const { recalculateMachineCollections } =
        await import('@/app/api/lib/helpers/collectionReport/recalculation');

      for (const col of collections) {
        if (!col.machineId) continue;

        try {
          // Find the next active collection (not deleted/archived)
          const nextReport = await Collections.findOne({
            machineId: col.machineId,
            location: col.location,
            timestamp: {
              $gt: col.timestamp || col.collectionTime || new Date(),
            },
            deletedAt: { $exists: false },
          })
            .sort({ timestamp: 1 })
            .lean<CollectionDocument>();

          if (nextReport) {
            console.log(
              `[delete-by-report] Propagating deletion for machine ${col.machineId}: setting successor ${nextReport._id} prevMeters to deleted report's prevMetersIn=${col.prevIn}, prevMetersOut=${col.prevOut}`
            );

            const newPrevIn = col.prevIn || 0;
            const newPrevOut = col.prevOut || 0;
            const currentMetersIn = nextReport.metersIn ?? 0;
            const currentMetersOut = nextReport.metersOut ?? 0;
            const ramClear = !!nextReport.ramClear;
            const ramClearMetersIn = nextReport.ramClearMetersIn;
            const ramClearMetersOut = nextReport.ramClearMetersOut;

            let movementIn = 0;
            let movementOut = 0;

            if (ramClear) {
              if (
                ramClearMetersIn !== undefined &&
                ramClearMetersOut !== undefined
              ) {
                movementIn = ramClearMetersIn - newPrevIn + currentMetersIn;
                movementOut = ramClearMetersOut - newPrevOut + currentMetersOut;
              } else {
                movementIn = currentMetersIn;
                movementOut = currentMetersOut;
              }
            } else {
              movementIn = currentMetersIn - newPrevIn;
              movementOut = currentMetersOut - newPrevOut;
            }

            const movement = {
              metersIn: Number(movementIn.toFixed(2)),
              metersOut: Number(movementOut.toFixed(2)),
              gross: Number((movementIn - movementOut).toFixed(2)),
            };

            const collectionUpdate: Record<string, unknown> = {
              prevIn: newPrevIn,
              prevOut: newPrevOut,
              movement,
              softMetersIn:
                ramClear && ramClearMetersIn
                  ? ramClearMetersIn
                  : currentMetersIn,
              softMetersOut:
                ramClear && ramClearMetersOut
                  ? ramClearMetersOut
                  : currentMetersOut,
            };

            if (nextReport.sasMeters) {
              const sasMetersData = {
                ...nextReport.sasMeters,
                drop: movement.metersIn,
                totalCancelledCredits: movement.metersOut,
                gross: movement.gross,
              };
              collectionUpdate.sasMeters = sasMetersData;
            }

            await Collections.updateOne(
              { _id: nextReport._id },
              { $set: collectionUpdate }
            );

            const updatedNextReport = {
              ...nextReport,
              ...collectionUpdate,
            };

            await updateRegularAndRamClearMeters(
              updatedNextReport as CollectionDocument
            );
          }

          // Re-sync machine's current meters and history from database
          await recalculateMachineCollections(String(col.machineId), true);
        } catch (machineError) {
          console.error(
            `[delete-by-report] Failed to propagate deletion/recalculate machine ${col.machineId}:`,
            machineError
          );
        }
      }

      // ============================================================================
      // STEP 8.5: Log Activity
      // ============================================================================
      const currentUser = await getUserFromServer();
      if (currentUser && existingReport) {
        const reportChanges = mapDeletedFieldsToChanges(existingReport);
        await logActivity({
          action: 'DELETE',
          details: `Deleted collection report for ${existingReport.locationName} via delete-by-report`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          metadata: {
            resource: 'collection-report',
            resourceId: locationReportId,
            resourceName: existingReport.locationName,
            changes: reportChanges,
            previousData: {
              ...existingReport,
              collections,
            },
            newData: null,
          },
        });

        // Log each collection being deleted
        for (const collection of collections) {
          const collectionChanges = mapDeletedFieldsToChanges(collection || {});
          await logActivity({
            action: 'DELETE',
            details: `Deleted collection for machine "${collection.machineCustomName || collection.machineName || collection.machineId || 'Machine'}" as part of delete-by-report cleanup`,
            ipAddress: getClientIP(request) || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            userId: currentUser._id as string,
            username: currentUser.emailAddress as string,
            metadata: {
              resource: 'collection',
              resourceId: String(collection._id),
              resourceName:
                collection.machineCustomName ||
                collection.machineName ||
                collection.machineId ||
                'Machine',
              changes: collectionChanges,
              previousData: collection,
              newData: null,
            },
          });
        }
      }

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
