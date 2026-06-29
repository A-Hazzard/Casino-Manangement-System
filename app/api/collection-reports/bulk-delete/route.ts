/**
 * Bulk Delete Collection Reports API Route
 *
 * This route handles batch deletion of multiple collection reports.
 * Each report is deleted using the same logic as the single-delete endpoint
 * but without SSE streaming.
 *
 * @module app/api/collection-reports/bulk-delete/route
 */

import { deleteManualMetersPerCollection } from '@/app/api/lib/helpers/collectionReport/operations';
import { propagateCRDeletionForward } from '@/app/api/lib/helpers/collectionReport/deletionPropagation';
import { logCRDeletionActivity } from '@/app/api/lib/helpers/collectionReport/crActivityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import {
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { CollectionDocument } from '@/lib/types/collection';
import type { CollectionReportDocument } from '@/shared/types';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const functionName = 'POST /api/collection-reports/bulk-delete';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Parse request body
    // ============================================================================
    const body = await request.json();
    const { reportIds } = body as { reportIds?: string[] };

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'reportIds array is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Role check
    // ============================================================================
    const currentUser = await getUserFromServer();
    const userRoles = ((currentUser as Record<string, unknown>)?.roles ||
      []) as string[];

    const deleteRoles = ['developer', 'owner', 'admin', 'location admin'];
    if (!deleteRoles.some(role => userRoles.includes(role))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete reports' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 4: Delete each report
    // ============================================================================
    const ipAddress = getClientIP(request) || undefined;
    const userAgent = request.headers.get('user-agent');
    const results: { reportId: string; success: boolean; error?: string }[] =
      [];

    for (const reportId of reportIds) {
      try {
        const existingReport = await CollectionReport.findOne({
          locationReportId: reportId,
        }).lean<Record<string, unknown> | null>();

        const resolvedReportId = existingReport
          ? (existingReport.locationReportId as string) || reportId
          : reportId;

        const associatedCollections = await Collections.find({
          locationReportId: resolvedReportId,
        }).lean<CollectionDocument[]>();

        // Remove meter records
        const deleteMetersResult =
          await deleteManualMetersPerCollection(resolvedReportId);
        if (!deleteMetersResult.success) {
          console.warn(
            `[BulkDelete] Failed to delete meters for report ${resolvedReportId}: ${deleteMetersResult.error}`
          );
        }

        // Delete collections
        await Collections.deleteMany({
          locationReportId: resolvedReportId,
        });

        // Delete report document
        if (existingReport) {
          const deletedReport = await CollectionReport.findOneAndDelete({
            _id: existingReport._id,
          });
          if (!deletedReport) {
            results.push({
              reportId,
              success: false,
              error: 'Failed to delete report document',
            });
            continue;
          }
        }

        // Propagate deletion forward
        await propagateCRDeletionForward(associatedCollections);

        // Log activity
          if (currentUser && existingReport) {
            await logCRDeletionActivity({
              existingReport: existingReport as unknown as CollectionReportDocument,
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

        results.push({ reportId, success: true });
      } catch (reportError) {
        console.error(
          `[BulkDelete] Error deleting report ${reportId}:`,
          reportError instanceof Error ? reportError.message : 'Unknown error'
        );
        results.push({
          reportId,
          success: false,
          error:
            reportError instanceof Error
              ? reportError.message
              : 'Unknown error',
        });
      }
    }

    // ============================================================================
    // STEP 5: Return results
    // ============================================================================
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const duration = Date.now() - startTime;
    logRouteDelete(functionName, 'POST', '/api/collection-reports/bulk-delete', reportIds.length, user, duration);

    return NextResponse.json({
      success: failed === 0,
      results,
      summary: {
        total: reportIds.length,
        successful,
        failed,
      },
    });
  } catch (error: unknown) {
    console.error(`[BulkDelete] Error:`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'POST',
      '/api/collection-reports/bulk-delete',
      errorMessage,
      user
    );
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
