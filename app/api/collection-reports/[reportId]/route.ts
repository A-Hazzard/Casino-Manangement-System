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
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  deleteManualMetersPerCollection,
  removeCollectionHistoryFromMachines,
  revertMachineCollectionMeters,
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
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/collection-reports/[reportId]',
      errorMessage,
      user
    );
    console.error(`[Collection Reports GET API] Error:`, errorMessage);
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
        // Comparison logic... (same as in singular route)
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
          if (body[field as keyof typeof body] !== undefined) {
            updateChanges.push({
              field,
              oldValue: (existingReportObj as Record<string, unknown>)[field],
              newValue: (body as Record<string, unknown>)[field],
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
    // STEP 2: Parse reportId from URL
    // ============================================================================
    const reportId = request.nextUrl.pathname.split('/').pop();

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
    // STEP 5: Remove collection history from machines
    // ============================================================================
    const historyResult =
      await removeCollectionHistoryFromMachines(resolvedReportId);
    if (!historyResult.success) {
      return NextResponse.json(
        {
          message: historyResult.error || 'Failed to remove collection history',
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 6: Revert machine collection meters
    // ============================================================================
    const revertResult = await revertMachineCollectionMeters(
      associatedCollections
    );
    if (!revertResult.success) {
      return NextResponse.json(
        {
          message: `Failed to revert machine meters: ${revertResult.errors.join(', ')}`,
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 7: Delete manual meters per collection
    // ============================================================================
    const deleteMetersResult =
      await deleteManualMetersPerCollection(resolvedReportId);
    if (!deleteMetersResult.success) {
      return NextResponse.json(
        {
          message: deleteMetersResult.error || 'Failed to delete manual meters',
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 8: Delete associated collections
    // ============================================================================
    const deleteCollectionsResult = await Collections.deleteMany({
      locationReportId: resolvedReportId,
    });
    if (deleteCollectionsResult.deletedCount === 0) {
      console.warn(
        `[DELETE] No collections deleted for report ${resolvedReportId}`
      );
    }

    // ============================================================================
    // STEP 9: Delete collection report
    // ============================================================================
    const deletedReport = await CollectionReport.findOneAndDelete({
      _id: existingReport._id,
    });
    if (!deletedReport) {
      return NextResponse.json(
        { message: 'Failed to delete collection report' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 10: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser) {
      await logActivity({
        action: 'DELETE',
        details: `Deleted collection report for ${existingReport.locationName}`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        userId: currentUser._id as string,
        username: currentUser.emailAddress as string,
        metadata: {
          resource: 'collection-report',
          resourceId: resolvedReportId,
          resourceName: existingReport.locationName,
        },
      });
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
