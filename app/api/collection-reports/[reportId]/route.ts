/**
 * Collection Report Individual Item API Route (Centralized)
 *
 * This route handles fetching, updating, and deleting collection reports by reportId.
 * Standardizes on supporting both human-readable locationReportId and MongoDB _id.
 *
 * It supports:
 * - GET: Retrieves a collection report with machine metrics and access control
 * - PATCH: Updates a collection report and cascades changes to related collections
 * - DELETE: Deletes a collection report and reverts machine collection meters
 *
 * @module app/api/collection-reports/[reportId]/route
 */

import { getCollectionReportById } from '@/app/api/lib/helpers/accountingDetails';
import {
  logActivity,
  mapDeletedFieldsToChanges,
} from '@/app/api/lib/helpers/activityLogger';
import {
  deleteManualMetersPerCollection,
  updateCollectionReport,
} from '@/app/api/lib/helpers/collectionReport/operations';
import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import {
  logRouteFetch,
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { CollectionDocument } from '@/lib/types/collection';
import type { CollectionReportDocument } from '@/shared/types';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';

/**
 * Main GET handler for fetching an individual collection report
 *
 * Retrieves a collection report with machine metrics and access control checks.
 * Standardizes on supporting both human-readable locationReportId and MongoDB _id.
 * The reportId is extracted from the request URL path.
 *
 * @param {NextRequest} request - Information about the incoming request
 *
 * Flow:
 * 1. Connect to the database
 * 2. Parse reportId from URL
 * 3. Find report by locationReportId or MongoDB _id
 * 4. Verify user has access to the location
 * 5. Fetch user session
 * 6. Fetch enriched report data using helper
 * 7. Handle missing collectionDate fallback
 * 8. Return report data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const functionName = 'GET /api/collection-reports/[reportId]';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse reportId from URL
    // ============================================================================
    const reportId = request.nextUrl.pathname.split('/').pop();

    if (!reportId) {
      logRouteError(
        functionName,
        'GET',
        '/api/collection-reports/[reportId]',
        'Report ID is required',
        user
      );
      return NextResponse.json(
        { message: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Find report by locationReportId or MongoDB _id
    // ============================================================================
    // Try finding by locationReportId first, then by MongoDB _id (maintenance fallback)
    let report = await CollectionReport.findOne({
      locationReportId: reportId,
    }).lean<CollectionReportDocument | null>();

    if (!report && /^[0-9a-fA-F]{24}$/.test(reportId)) {
      report = await CollectionReport.findOne({
        _id: reportId,
      }).lean<CollectionReportDocument | null>();
    }

    if (!report) {
      logRouteError(
        functionName,
        'GET',
        '/api/collection-reports/[reportId]',
        'Collection Report not found',
        user
      );
      return NextResponse.json(
        { message: 'Collection Report not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Verify user has access to the location
    // ============================================================================
    // Access control check based on location
    if (report.location) {
      const hasAccess = await checkUserLocationAccess(report.location);
      if (!hasAccess) {
        logRouteError(
          functionName,
          'GET',
          '/api/collection-reports/[reportId]',
          'Unauthorized: location access denied',
          user
        );
        return NextResponse.json(
          {
            message:
              "Unauthorized: You do not have access to this collection report's location",
          },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 5: Fetch user session
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (!currentUser) {
      logRouteError(
        functionName,
        'GET',
        '/api/collection-reports/[reportId]',
        'User not found',
        user
      );
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // ============================================================================
    // STEP 6: Fetch enriched report data using helper
    // ============================================================================
    // Fetch full enriched report data using helper (handles either ID type)
    const reportData = await getCollectionReportById(
      (report.locationReportId as string) || reportId,
      currentUser as Parameters<typeof getCollectionReportById>[1]
    );

    if (!reportData) {
      return NextResponse.json(
        { message: 'Collection Report not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 7: Handle missing collectionDate fallback
    // ============================================================================
    // Fallback for missing collectionDate
    if (!reportData.collectionDate && report.timestamp) {
      reportData.collectionDate = new Date(report.timestamp).toISOString();
    }

    // ============================================================================
    // STEP 8: Return report data
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/collection-reports/[reportId]',
      1,
      user,
      duration
    );
    return NextResponse.json(reportData);
  } catch (error: unknown) {
    console.error(`[GET /api/collection-reports/[reportId]] Error:`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/collection-reports/[reportId]',
      errorMessage,
      user
    );
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

/**
 * Main PATCH handler for updating an individual collection report
 *
 * Updates a collection report and cascades changes to related collections.
 * The reportId is extracted from the request URL path.
 *
 * @param {NextRequest} request - Information about the incoming request
 * @body {Partial<CreateCollectionReportPayload>} updateData - Fields to update (amountCollected, etc.)
 *
 * Flow:
 * 1. Connect to the database
 * 2. Parse reportId from URL and request body
 * 3. Find existing report (handle either ID type)
 * 4. Fetch associated collections to track machine list changes
 * 5. Update using specialized helper
 * 6. Log activity
 * 7. Return success response
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const functionName = 'PATCH /api/collection-reports/[reportId]';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse reportId from URL and request body
    // ============================================================================
    const reportId = request.nextUrl.pathname.split('/').pop();

    if (!reportId) {
      logRouteError(
        functionName,
        'PATCH',
        '/api/collection-reports/[reportId]',
        'Report ID is required',
        user
      );
      return NextResponse.json(
        { message: 'Report ID is required' },
        { status: 400 }
      );
    }

    const body =
      (await request.json()) as Partial<CreateCollectionReportPayload>;

    // CRITICAL: Do not update the collector field during edit
    delete body.collector;
    delete body.collectorName;

    // ============================================================================
    // STEP 3: Find existing report (handle either ID type)
    // ============================================================================
    // Find the report to handle either ID type
    let existingReport = await CollectionReport.findOne({
      locationReportId: reportId,
    });
    if (!existingReport && /^[0-9a-fA-F]{24}$/.test(reportId)) {
      existingReport = await CollectionReport.findOne({ _id: reportId });
    }

    if (!existingReport) {
      return NextResponse.json(
        { message: 'Collection Report not found' },
        { status: 404 }
      );
    }

    const resolvedReportId = existingReport.locationReportId || reportId;

    // ============================================================================
    // STEP 4: Fetch associated collections to track machine list changes
    // ============================================================================
    // Fetch associated collections to track machine list changes
    const existingCollections = await Collections.find({
      locationReportId: resolvedReportId,
    }).lean<CollectionDocument[]>();

    // ============================================================================
    // STEP 5: Update using specialized helper
    // ============================================================================
    // Update using specialized helper
    const updateResult = await updateCollectionReport(resolvedReportId, body);

    if (!updateResult.success) {
      return NextResponse.json(
        { message: updateResult.error || 'Failed to update collection report' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 6: Log activity
    // ============================================================================
    // Logging Logic
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const updateChanges: {
          field: string;
          oldValue: unknown;
          newValue: unknown;
        }[] = [];
        const isDifferent = (oldVal: unknown, newVal: unknown): boolean => {
          if (oldVal === newVal) return false;
          if (oldVal == null || newVal == null) {
            return (oldVal == null) !== (newVal == null);
          }
          if (typeof oldVal === 'number' || typeof newVal === 'number') {
            return Number(oldVal) !== Number(newVal);
          }
          if (typeof oldVal === 'boolean' || typeof newVal === 'boolean') {
            return Boolean(oldVal) !== Boolean(newVal);
          }
          if (oldVal instanceof Date || newVal instanceof Date) {
            try {
              const t1 = new Date(oldVal as Date).getTime();
              const t2 = new Date(newVal as Date).getTime();
              if (!isNaN(t1) && !isNaN(t2)) return t1 !== t2;
            } catch {
              // Fallback
            }
          }
          if (typeof oldVal === 'string' && typeof newVal === 'string') {
            const t1 = Date.parse(oldVal);
            const t2 = Date.parse(newVal);
            if (!isNaN(t1) && !isNaN(t2)) {
              return t1 !== t2;
            }
            return oldVal.trim() !== newVal.trim();
          }
          return String(oldVal).trim() !== String(newVal).trim();
        };

        const existingReportObj = existingReport.toObject();
        const fieldsToTrack = [
          'locationName',
          'amountCollected',
          'amountToCollect',
          'variance',
          'partnerProfit',
          'taxes',
        ];
        fieldsToTrack.forEach(field => {
          const newVal = (body as Record<string, unknown>)[field];
          const oldVal = (existingReportObj as Record<string, unknown>)[field];
          if (newVal !== undefined && isDifferent(oldVal, newVal)) {
            updateChanges.push({
              field,
              oldValue: oldVal,
              newValue: newVal,
            });
          }
        });

        if (body.machines && Array.isArray(body.machines)) {
          const oldMachineIds =
            existingCollections.map(
              collection => collection.machineId as string
            ) || [];
          const newMachineIds = (body.machines as { machineId: string }[]).map(
            machine => machine.machineId
          );
          const added = (
            body.machines as {
              machineId: string;
              machineName?: string;
              machineCustomName?: string;
            }[]
          ).filter(machine => !oldMachineIds.includes(machine.machineId));
          const removed = (
            existingCollections as {
              machineId: string;
              machineName?: string;
              machineCustomName?: string;
            }[]
          ).filter(collection => !newMachineIds.includes(collection.machineId));

          if (added.length > 0) {
            updateChanges.push({
              field: 'machines_added',
              oldValue: null,
              newValue: added
                .map(
                  machine =>
                    machine.machineCustomName ||
                    machine.machineName ||
                    machine.machineId
                )
                .join(', '),
            });
          }
          if (removed.length > 0) {
            updateChanges.push({
              field: 'machines_removed',
              oldValue: removed
                .map(
                  collection =>
                    collection.machineCustomName ||
                    collection.machineName ||
                    collection.machineId
                )
                .join(', '),
              newValue: null,
            });
          }
        }

        await logActivity({
          action: 'UPDATE',
          details: `Updated collection report for ${existingReport.locationName} (${updateChanges.length} changes)`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          metadata: {
            userId: currentUser._id as string,
            resource: 'collection-report',
            resourceId: resolvedReportId,
            resourceName: `${existingReport.locationName}`,
            changes: updateChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 7: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteUpdate(
      functionName,
      'PATCH',
      '/api/collection-reports/[reportId]',
      1,
      user,
      duration
    );
    return NextResponse.json({ success: true, data: updateResult.data });
  } catch (error: unknown) {
    console.error(`[PATCH /api/collection-reports/[reportId]] Error:`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'PATCH',
      '/api/collection-reports/[reportId]',
      errorMessage,
      user
    );
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

/**
 * Main DELETE handler for an individual collection report
 *
 * Deletes a collection report and reverts machine collection meters to previous state.
 * The reportId is extracted from the request URL path.
 *
 * @param {NextRequest} request - Information about the incoming request
 *
 * Flow:
 * 1. Connect to the database
 * 2. Parse reportId from URL
 * 3. Find existing report
 * 4. Fetch associated collections
 * 5. Remove collection history from machines
 * 6. Revert machine collection meters
 * 7. Delete manual meters per collection
 * 8. Delete associated collections
 * 9. Delete collection report
 * 10. Log activity
 * 11. Return success response
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const functionName = 'DELETE /api/collection-reports/[reportId]';
  const user = extractUserFromRequest(request);
  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse reportId from URL and action param
    // ============================================================================
    const reportId = request.nextUrl.pathname.split('/').pop();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'permanent';
    const archive = action === 'archive';

    if (!reportId) {
      logRouteError(
        functionName,
        'DELETE',
        '/api/collection-reports/[reportId]',
        'Report ID is required',
        user
      );
      return NextResponse.json(
        { message: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Find existing report
    // ============================================================================
    let existingReport = await CollectionReport.findOne({
      locationReportId: reportId,
    }).lean<CollectionReportDocument | null>();
    if (!existingReport && /^[0-9a-fA-F]{24}$/.test(reportId)) {
      existingReport = await CollectionReport.findOne({ _id: reportId });
    }

    if (!existingReport) {
      logRouteError(
        functionName,
        'DELETE',
        '/api/collection-reports/[reportId]',
        'Collection Report not found',
        user
      );
      return NextResponse.json(
        { message: 'Collection Report not found' },
        { status: 404 }
      );
    }

    const resolvedReportId = existingReport.locationReportId || reportId;

    // ============================================================================
    // STEP 4: Fetch associated collections
    // ============================================================================
    const associatedCollections = await Collections.find({
      locationReportId: resolvedReportId,
    }).lean<CollectionDocument[]>();
    console.log(
      `[DELETE] Found ${associatedCollections.length} collections for report ${resolvedReportId}`
    );

    // ============================================================================
    // STEP 7: Delete/Archive manual meters per collection
    // ============================================================================
    const deleteMetersResult = await deleteManualMetersPerCollection(
      resolvedReportId,
      archive
    );
    if (!deleteMetersResult.success) {
      return NextResponse.json(
        {
          message:
            deleteMetersResult.error ||
            `Failed to ${archive ? 'archive' : 'delete'} manual meters`,
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 8: Delete/Archive associated collections
    // ============================================================================
    let deleteCollectionsResult;
    if (archive) {
      deleteCollectionsResult = await Collections.updateMany(
        { locationReportId: resolvedReportId },
        { $set: { deletedAt: new Date() } }
      );
    } else {
      deleteCollectionsResult = await Collections.deleteMany({
        locationReportId: resolvedReportId,
      });
    }
    let affectedCount = 0;
    if (archive) {
      affectedCount = (deleteCollectionsResult as { modifiedCount: number })
        .modifiedCount;
    } else {
      affectedCount = (deleteCollectionsResult as { deletedCount: number })
        .deletedCount;
    }
    if (affectedCount === 0) {
      console.warn(
        `[DELETE] No collections ${archive ? 'archived' : 'deleted'} for report ${resolvedReportId}`
      );
    }

    // ============================================================================
    // STEP 9: Delete/Archive collection report
    // ============================================================================
    let deletedReport;
    if (archive) {
      deletedReport = await CollectionReport.findOneAndUpdate(
        { _id: existingReport._id },
        { $set: { deletedAt: new Date() } },
        { new: true }
      );
    } else {
      deletedReport = await CollectionReport.findOneAndDelete({
        _id: existingReport._id,
      });
    }
    if (!deletedReport) {
      return NextResponse.json(
        {
          message: `Failed to ${archive ? 'archive' : 'delete'} collection report`,
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 9.5: Propagate deletion forward and recalculate machines
    // ============================================================================
    const { updateRegularAndRamClearMeters } =
      await import('@/app/api/lib/helpers/collectionReport/reportCreation');
    const { recalculateMachineCollections } =
      await import('@/app/api/lib/helpers/collectionReport/recalculation');

    for (const col of associatedCollections) {
      if (!col.machineId) continue;

      try {
        // Find the next active collection (not deleted/archived)
        const nextReport = await Collections.findOne({
          machineId: col.machineId,
          timestamp: { $gt: col.timestamp || col.collectionTime || new Date() },
          deletedAt: { $exists: false },
        })
          .sort({ timestamp: 1 })
          .lean<CollectionDocument>();

        if (nextReport) {
          console.log(
            `[DELETE /api/collection-reports/[reportId]] Propagating deletion for machine ${col.machineId}: setting successor ${nextReport._id} prevMeters to deleted report's prevMetersIn=${col.prevIn}, prevMetersOut=${col.prevOut}`
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
              ramClear && ramClearMetersIn ? ramClearMetersIn : currentMetersIn,
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
          `Failed to propagate deletion/recalculate machine ${col.machineId}:`,
          machineError
        );
      }
    }

    // ============================================================================
    // STEP 10: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser) {
      const changes = mapDeletedFieldsToChanges(existingReport || {});
      await logActivity({
        action: archive ? 'ARCHIVE' : 'DELETE',
        details: `${archive ? 'Archived' : 'Deleted'} collection report for ${existingReport.locationName}`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        userId: currentUser._id as string,
        username: currentUser.emailAddress as string,
        metadata: {
          resource: 'collection-report',
          resourceId: resolvedReportId,
          resourceName: existingReport.locationName,
          changes,
          previousData: {
            ...existingReport,
            collections: associatedCollections,
          },
          newData: null,
        },
      });

      // Log each associated collection being deleted
      for (const collection of associatedCollections) {
        const collectionChanges = mapDeletedFieldsToChanges(collection || {});
        await logActivity({
          action: 'DELETE',
          details: `Deleted collection for machine "${collection.machineCustomName || collection.machineName || collection.machineId || 'Machine'}" as part of collection report deletion`,
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
    // STEP 11: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteDelete(
      functionName,
      'DELETE',
      '/api/collection-reports/[reportId]',
      1,
      user,
      duration
    );
    return NextResponse.json({
      success: true,
      message: 'Collection report deleted successfully',
    });
  } catch (error: unknown) {
    console.error(`[DELETE /api/collection-reports/[reportId]] Error:`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'DELETE',
      '/api/collection-reports/[reportId]',
      errorMessage,
      user
    );
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
