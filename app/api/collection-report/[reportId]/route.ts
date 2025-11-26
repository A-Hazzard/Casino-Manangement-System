/**
 * Collection Report by ID API Route
 *
 * This route handles fetching, updating, and deleting collection reports by reportId.
 * It supports:
 * - GET: Retrieves a collection report with machine metrics and access control
 * - PATCH: Updates a collection report and cascades changes to related collections
 * - DELETE: Deletes a collection report and reverts machine collection meters
 *
 * @module app/api/collection-report/[reportId]/route
 */

import { NextResponse, NextRequest } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getCollectionReportById } from '@/app/api/lib/helpers/accountingDetails';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '../../lib/helpers/users';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenseeFilter';
import {
  updateCollectionReport,
  removeCollectionHistoryFromMachines,
  revertMachineCollectionMeters,
} from '@/app/api/lib/helpers/collectionReportOperations';

/**
 * Main GET handler for collection report by ID
 *
 * Flow:
 * 1. Connect to database
 * 2. Extract and validate reportId from URL
 * 3. Check user access to report location
 * 4. Fetch full report data
 * 5. Ensure collectionDate is present
 * 6. Return report data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Extract and validate reportId from URL
    // ============================================================================
    const reportId = request.nextUrl.pathname.split('/').pop();

    if (!reportId) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report GET API] Missing report ID after ${duration}ms.`
      );
      return NextResponse.json(
        { message: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Check user access to report location
    // ============================================================================
    const report = await CollectionReport.findOne({
      locationReportId: reportId,
    }).lean();

    if (!report) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report GET API] Report not found: ${reportId} after ${duration}ms.`
      );
      return NextResponse.json(
        { message: 'Collection Report not found' },
        { status: 404 }
      );
    }

    if (report.location) {
      const hasAccess = await checkUserLocationAccess(String(report.location));
      if (!hasAccess) {
        const duration = Date.now() - startTime;
        console.error(
          `[Collection Report GET API] Unauthorized access to report ${reportId} after ${duration}ms.`
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
    // STEP 4: Fetch full report data
    // ============================================================================
    const reportData = await getCollectionReportById(reportId);
    if (!reportData) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report GET API] Report data not found: ${reportId} after ${duration}ms.`
      );
      return NextResponse.json(
        { message: 'Collection Report not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Ensure collectionDate is present (fallback to timestamp if missing)
    // ============================================================================
    if (!reportData.collectionDate) {
      const reportDoc = await CollectionReport.findOne({
        locationReportId: reportId,
      });
      if (reportDoc?.timestamp) {
        reportData.collectionDate = new Date(
          reportDoc.timestamp
        ).toISOString();
      }
    }

    // ============================================================================
    // STEP 6: Return report data
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Collection Report GET API] Successfully fetched report ${reportId} (${reportData.machineMetrics?.length || 0} machines) after ${duration}ms.`
    );
    return NextResponse.json(reportData);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Collection Report GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

/**
 * Main PATCH handler for updating collection report
 *
 * Flow:
 * 1. Connect to database
 * 2. Extract and validate reportId from URL
 * 3. Parse and validate request body
 * 4. Get existing report for logging
 * 5. Update collection report using helper
 * 6. Log activity
 * 7. Return updated report
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Extract and validate reportId from URL
    // ============================================================================
    const reportId = request.nextUrl.pathname.split('/').pop();

    if (!reportId) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report PATCH API] Missing report ID after ${duration}ms.`
      );
      return NextResponse.json(
        { message: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Parse and validate request body
    // ============================================================================
    const body =
      (await request.json()) as Partial<CreateCollectionReportPayload>;

    // ============================================================================
    // STEP 4: Get existing report for logging
    // ============================================================================
    const existingReport = await CollectionReport.findOne({ _id: reportId });
    if (!existingReport) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report PATCH API] Report not found: ${reportId} after ${duration}ms.`
      );
      return NextResponse.json(
        { message: 'Collection Report not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Update collection report using helper
    // ============================================================================
    const updateResult = await updateCollectionReport(reportId, body);

    if (!updateResult.success) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report PATCH API] Failed to update report ${reportId} after ${duration}ms: ${updateResult.error}`
      );
      return NextResponse.json(
        { message: updateResult.error || 'Failed to update collection report' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 6: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const updateChanges = Object.keys(body).map(key => ({
          field: key,
          oldValue: existingReport[key as keyof typeof existingReport],
          newValue: body[key as keyof typeof body],
        }));

        await logActivity({
          action: 'UPDATE',
          details: `Updated collection report for ${existingReport.locationName}`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'collection',
            resourceId: reportId,
            resourceName: `${existingReport.locationName} - ${existingReport.collectorName}`,
            changes: updateChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 7: Return updated report
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Collection Report PATCH API] Successfully updated report ${reportId} after ${duration}ms.`
    );
    return NextResponse.json({
      success: true,
      data: updateResult.data,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Collection Report PATCH API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

/**
 * Main DELETE handler for deleting collection report
 *
 * Flow:
 * 1. Connect to database
 * 2. Extract and validate reportId from URL
 * 3. Get existing report and associated collections
 * 4. Remove collection history entries from machines
 * 5. Revert machine collection meters
 * 6. Delete associated collections and report
 * 7. Log activity
 * 8. Return success response
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Extract and validate reportId from URL
    // ============================================================================
    const reportId = request.nextUrl.pathname.split('/').pop();

    if (!reportId) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report DELETE API] Missing report ID after ${duration}ms.`
      );
      return NextResponse.json(
        { message: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Get existing report and associated collections
    // ============================================================================
    const existingReport = await CollectionReport.findOne({ _id: reportId });
    if (!existingReport) {
      const duration = Date.now() - startTime;
      console.error(
        `[Collection Report DELETE API] Report not found: ${reportId} after ${duration}ms.`
      );
      return NextResponse.json(
        { message: 'Collection Report not found' },
        { status: 404 }
      );
    }

    const associatedCollections = await Collections.find({
      locationReportId: reportId,
    });

    // ============================================================================
    // STEP 4: Remove collection history entries from machines
    // ============================================================================
    const machinesUpdated = await removeCollectionHistoryFromMachines(reportId);
    console.log(
      `[Collection Report DELETE API] Removed collection history from ${machinesUpdated} machines for reportId: ${reportId}`
    );

    // ============================================================================
    // STEP 5: Revert machine collection meters
    // ============================================================================
    await revertMachineCollectionMeters(associatedCollections);

    // ============================================================================
    // STEP 6: Delete associated collections and report
    // ============================================================================
    await Collections.deleteMany({ locationReportId: reportId });
    await CollectionReport.findOneAndDelete({ _id: reportId });

    // ============================================================================
    // STEP 7: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity({
          action: 'DELETE',
          details: `Deleted collection report for ${existingReport.locationName} with ${associatedCollections.length} associated collections. Collection meters reverted to previous values for all affected machines.`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'collection',
            resourceId: reportId,
            resourceName: `${existingReport.locationName} - ${existingReport.collectorName}`,
            changes: [],
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 8: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Collection Report DELETE API] Successfully deleted report ${reportId} with ${associatedCollections.length} collections after ${duration}ms.`
    );
    return NextResponse.json({
      success: true,
      message: `Collection report and ${associatedCollections.length} associated collections deleted successfully. Collection meters reverted to previous values.`,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Collection Report DELETE API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
