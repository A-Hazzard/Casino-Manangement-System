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
  deleteManualMetersPerCollection,
  updateCollectionReport,
} from '@/app/api/lib/helpers/collectionReport/operations';
import { propagateCRDeletionForward } from '@/app/api/lib/helpers/collectionReport/deletionPropagation';
import {
  logCRPatchActivity,
  logCRDeletionActivity,
} from '@/app/api/lib/helpers/collectionReport/crActivityLogger';
import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import {
  logRouteFetch,
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  logRouteRequest,
  logRoutePhase,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import { getClientIP } from '@/lib/utils/ipAddress';
import { createSseResponse } from '@/app/api/lib/utils/sseStream';
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
  logRouteRequest(functionName, 'GET', request.nextUrl.pathname, user);

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();
    logRoutePhase(functionName, 'db connected', Date.now() - startTime);

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
    let report = await CollectionReport.findOne({
      locationReportId: reportId,
    }).lean<CollectionReportDocument | null>();

    if (!report) {
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
    logRoutePhase(
      functionName,
      'enriching report data — start',
      Date.now() - startTime
    );
    const reportData = await getCollectionReportById(
      (report.locationReportId as string) || reportId,
      currentUser as Parameters<typeof getCollectionReportById>[1],
      report
    );
    logRoutePhase(
      functionName,
      'enriching report data — done',
      Date.now() - startTime
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
export async function PATCH(
  request: NextRequest
): Promise<NextResponse | Response> {
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
    let existingReport = await CollectionReport.findOne({
      locationReportId: reportId,
    });
    if (!existingReport) {
      existingReport = await CollectionReport.findOne({ _id: reportId });
    }

    if (!existingReport) {
      return NextResponse.json(
        { message: 'Collection Report not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 3.5: Verify user has access to the report's location
    // ============================================================================
    if (existingReport.location) {
      const hasAccess = await checkUserLocationAccess(existingReport.location);
      if (!hasAccess) {
        logRouteError(
          functionName,
          'PATCH',
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

    const resolvedReportId = existingReport.locationReportId || reportId;

    // ============================================================================
    // STEP 4–7: Stream SSE phases while updating the report
    // ============================================================================
    const ipAddress = getClientIP(request) || undefined;
    const userAgent = request.headers.get('user-agent');

    return createSseResponse(async send => {
      // Fetch existing collections for activity logging
      send({ type: 'phase', phase: 'fetching' });
      logRoutePhase(
        functionName,
        'fetching existing collections',
        Date.now() - startTime
      );
      const existingCollections = await Collections.find({
        locationReportId: resolvedReportId,
      }).lean<CollectionDocument[]>();

      // Update — helper emits saving / recalculating / variation
      logRoutePhase(
        functionName,
        'updating report — start',
        Date.now() - startTime
      );
      const updateResult = await updateCollectionReport(
        resolvedReportId,
        body,
        phase => send({ type: 'phase', phase }),
        (phase, done, total, machineName) =>
          send({ type: 'progress', phase, done, total, machineName })
      );

      if (!updateResult.success) {
        send({
          type: 'error',
          message: updateResult.error || 'Failed to update collection report',
        });
        return;
      }
      logRoutePhase(
        functionName,
        'updating report — done',
        Date.now() - startTime
      );

      // Log activity
      send({ type: 'phase', phase: 'activity' });
      logRoutePhase(functionName, 'recording activity', Date.now() - startTime);
      const currentUser = await getUserFromServer();
      if (currentUser && currentUser.emailAddress) {
        await logCRPatchActivity({
          existingReport,
          existingCollections,
          body,
          resolvedReportId,
          ipAddress,
          userAgent,
          currentUser: {
            _id: currentUser._id,
            emailAddress: currentUser.emailAddress,
          },
        });
      }

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'PATCH',
        '/api/collection-reports/[reportId]',
        1,
        user,
        duration
      );
      send({ type: 'done', data: { success: true, data: updateResult.data } });
    });
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
export async function DELETE(
  request: NextRequest
): Promise<NextResponse | Response> {
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
    // STEP 2.5: Role check
    // ============================================================================
    const currentUser = await getUserFromServer();
    const userRoles = ((currentUser as Record<string, unknown>)?.roles ||
      []) as string[];
    const deleteRoles = ['developer', 'owner', 'admin', 'location admin'];
    if (!deleteRoles.some(role => userRoles.includes(role))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete report' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 3: Find existing report
    // ============================================================================
    let existingReport = await CollectionReport.findOne({
      locationReportId: reportId,
    }).lean<CollectionReportDocument | null>();
    if (!existingReport) {
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

    // ============================================================================
    // STEP 3.5: Verify user has access to the report's location
    // ============================================================================
    if (existingReport.location) {
      const hasAccess = await checkUserLocationAccess(existingReport.location);
      if (!hasAccess) {
        logRouteError(
          functionName,
          'DELETE',
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

    const resolvedReportId = existingReport.locationReportId || reportId;

    // ============================================================================
    // STEP 4–11: Stream SSE phases while deleting the report
    // ============================================================================
    const ipAddress = getClientIP(request) || undefined;
    const userAgent = request.headers.get('user-agent');

    return createSseResponse(async send => {
      // Fetch collections
      send({ type: 'phase', phase: 'fetching' });
      logRoutePhase(
        functionName,
        'fetching collections',
        Date.now() - startTime
      );
      const associatedCollections = await Collections.find({
        locationReportId: resolvedReportId,
      }).lean<CollectionDocument[]>();
      logRoutePhase(
        functionName,
        `found ${associatedCollections.length} collections`,
        Date.now() - startTime
      );

      // Remove meter records
      send({ type: 'phase', phase: 'meters' });
      logRoutePhase(
        functionName,
        'removing meter records',
        Date.now() - startTime
      );
      const deleteMetersResult =
        await deleteManualMetersPerCollection(resolvedReportId);
      if (!deleteMetersResult.success) {
        send({
          type: 'error',
          message: deleteMetersResult.error || 'Failed to delete manual meters',
        });
        return;
      }
      logRoutePhase(
        functionName,
        'meter records removed',
        Date.now() - startTime
      );

      // Delete collections
      send({ type: 'phase', phase: 'collections' });
      logRoutePhase(
        functionName,
        'deleting collections',
        Date.now() - startTime
      );
      const deleteResult = await Collections.deleteMany({
        locationReportId: resolvedReportId,
      });
      if (deleteResult.deletedCount === 0) {
        console.warn(
          `[DELETE] No collections deleted for report ${resolvedReportId}`
        );
      }
      logRoutePhase(
        functionName,
        `deleted ${deleteResult.deletedCount} collections`,
        Date.now() - startTime
      );

      // Delete report document
      logRoutePhase(
        functionName,
        'deleting report document',
        Date.now() - startTime
      );
      const deletedReport = await CollectionReport.findOneAndDelete({
        _id: existingReport._id,
      });
      if (!deletedReport) {
        send({ type: 'error', message: 'Failed to delete collection report' });
        return;
      }
      logRoutePhase(
        functionName,
        'report document deleted',
        Date.now() - startTime
      );

      // Propagate deletion forward
      send({ type: 'phase', phase: 'propagating' });
      logRoutePhase(
        functionName,
        'updating linked reports — start',
        Date.now() - startTime
      );
      await propagateCRDeletionForward(associatedCollections);
      logRoutePhase(
        functionName,
        'updating linked reports — done',
        Date.now() - startTime
      );

      // Log activity
      send({ type: 'phase', phase: 'activity' });
      logRoutePhase(functionName, 'recording activity', Date.now() - startTime);
      if (currentUser) {
        await logCRDeletionActivity({
          existingReport: existingReport as CollectionReportDocument,
          associatedCollections,
          resolvedReportId,
          ipAddress,
          userAgent,
          currentUser: {
            _id: currentUser._id,
            emailAddress: currentUser.emailAddress,
          },
        });
      }
      logRoutePhase(functionName, 'activity recorded', Date.now() - startTime);

      const duration = Date.now() - startTime;
      logRouteDelete(
        functionName,
        'DELETE',
        '/api/collection-reports/[reportId]',
        1,
        user,
        duration
      );
      send({
        type: 'done',
        data: {
          success: true,
          message: 'Collection report deleted successfully',
        },
      });
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
