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
  removeCollectionHistoryFromMachines,
  revertMachineCollectionMeters,
  updateCollectionReport,
} from '@/app/api/lib/helpers/collectionReport/operations';
import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';

/**
 * GET /api/collection-reports/[reportId]
 */
export async function GET(request: NextRequest): Promise<NextResponse> {

  try {
    await connectDB();
    const reportId = request.nextUrl.pathname.split('/').pop();

    if (!reportId) {
      return NextResponse.json({ message: 'Report ID is required' }, { status: 400 });
    }

    // Try finding by locationReportId first, then by MongoDB _id (maintenance fallback)
    let report = await CollectionReport.findOne({ locationReportId: reportId }).lean();
    
    // Fallback to MongoDB _id if not found by locationReportId
    if (!report && /^[0-9a-fA-F]{24}$/.test(reportId)) {
        report = await CollectionReport.findOne({ _id: reportId }).lean();
    }

    if (!report) {
      return NextResponse.json({ message: 'Collection Report not found' }, { status: 404 });
    }

    // Access control check based on location
    if (report.location) {
      const hasAccess = await checkUserLocationAccess(report.location);
      if (!hasAccess) {
        return NextResponse.json(
          { message: "Unauthorized: You do not have access to this collection report's location" },
          { status: 403 }
        );
      }
    }

    const currentUser = await getUserFromServer();
    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Fetch full enriched report data using helper (handles either ID type)
    const reportData = await getCollectionReportById(
      (report.locationReportId as string) || reportId,
      currentUser as Parameters<typeof getCollectionReportById>[1]
    );

    if (!reportData) {
      return NextResponse.json({ message: 'Collection Report not found' }, { status: 404 });
    }

    // Fallback for missing collectionDate
    if (!reportData.collectionDate && report.timestamp) {
        reportData.collectionDate = new Date(report.timestamp).toISOString();
    }

    return NextResponse.json(reportData);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Collection Reports GET API] Error:`, errorMessage);
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

/**
 * PATCH /api/collection-reports/[reportId]
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {

  try {
    await connectDB();
    const reportId = request.nextUrl.pathname.split('/').pop();

    if (!reportId) {
      return NextResponse.json({ message: 'Report ID is required' }, { status: 400 });
    }

    const body = (await request.json()) as Partial<CreateCollectionReportPayload>;

    // CRITICAL: Do not update the collector field during edit
    delete body.collector;
    delete body.collectorName;

    // Find the report to handle either ID type
    let existingReport = await CollectionReport.findOne({ locationReportId: reportId });
    if (!existingReport && /^[0-9a-fA-F]{24}$/.test(reportId)) {
        existingReport = await CollectionReport.findOne({ _id: reportId });
    }

    if (!existingReport) {
      return NextResponse.json({ message: 'Collection Report not found' }, { status: 404 });
    }

    const resolvedReportId = existingReport.locationReportId || reportId;

    // Fetch associated collections to track machine list changes
    const existingCollections = await Collections.find({
      locationReportId: resolvedReportId,
    }).lean();

    // Update using specialized helper
    const updateResult = await updateCollectionReport(resolvedReportId, body);

    if (!updateResult.success) {
      return NextResponse.json(
        { message: updateResult.error || 'Failed to update collection report' },
        { status: 500 }
      );
    }

    // Logging Logic
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const updateChanges: { field: string; oldValue: unknown; newValue: unknown }[] = [];
        // Comparison logic... (same as in singular route)
        const existingReportObj = existingReport.toObject();
        const fieldsToTrack = ['locationName', 'amountCollected', 'amountToCollect', 'variance', 'partnerProfit', 'taxes'];
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
          const oldMachineIds = existingCollections.map((c) => c.machineId as string) || [];
          const newMachineIds = (body.machines as { machineId: string }[]).map((m) => m.machineId);
          const added = (body.machines as { machineId: string; machineName?: string; machineCustomName?: string }[]).filter((m) => !oldMachineIds.includes(m.machineId));
          const removed = (existingCollections as { machineId: string; machineName?: string; machineCustomName?: string }[]).filter((c) => !newMachineIds.includes(c.machineId));

          if (added.length > 0) {
            updateChanges.push({
              field: 'machines_added',
              oldValue: null,
              newValue: added.map((m) => (m.machineCustomName || m.machineName || m.machineId)).join(', '),
            });
          }
          if (removed.length > 0) {
            updateChanges.push({
              field: 'machines_removed',
              oldValue: removed.map((c) => (c.machineCustomName || c.machineName || c.machineId)).join(', '),
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

    return NextResponse.json({ success: true, data: updateResult.data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/collection-reports/[reportId]
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const reportId = request.nextUrl.pathname.split('/').pop();

    if (!reportId) {
      return NextResponse.json({ message: 'Report ID is required' }, { status: 400 });
    }

    let existingReport = await CollectionReport.findOne({ locationReportId: reportId });
    if (!existingReport && /^[0-9a-fA-F]{24}$/.test(reportId)) {
        existingReport = await CollectionReport.findOne({ _id: reportId });
    }

    if (!existingReport) {
      return NextResponse.json({ message: 'Collection Report not found' }, { status: 404 });
    }

    const resolvedReportId = existingReport.locationReportId || reportId;
    const associatedCollections = await Collections.find({ locationReportId: resolvedReportId });

    await removeCollectionHistoryFromMachines(resolvedReportId);
    await revertMachineCollectionMeters(associatedCollections);
    await Collections.deleteMany({ locationReportId: resolvedReportId });
    await CollectionReport.findOneAndDelete({ _id: existingReport._id });

    // Logging Logic
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

    return NextResponse.json({ success: true, message: 'Collection report deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
