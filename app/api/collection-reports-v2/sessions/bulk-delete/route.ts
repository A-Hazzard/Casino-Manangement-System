/**
 * Collection Report V2 — Bulk Delete Sessions API Route
 *
 * POST /api/collection-reports-v2/sessions/bulk-delete
 *   Body: { sessionIds: string[] }
 *   Deletes all specified sessions including their ReportedMachine docs,
 *   Meters, Drive assets, supplemental meter data, and reverted machine state.
 *
 * @module app/api/collection-reports-v2/sessions/bulk-delete/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Meters } from '@/app/api/lib/models/meters';
import type { ReportedMachineDocument } from '@/app/api/lib/models/reportedMachines';
import {
  deleteSessionDriveAssets,
  fixSupplementalMetersBeforeDelete,
} from '@/app/api/lib/helpers/collectionReportV2/sessionOperations';
import { revertMachineMetersAfterSessionDelete } from '@/app/api/lib/helpers/collectionReportV2/deleteOperations';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return withApiAuth(req, async ({ user: userPayload }) => {
    const functionName = 'POST /api/collection-reports-v2/sessions/bulk-delete';
    const startTime = Date.now();

    try {
      // ============================================================================
      // STEP 1: Parse and validate request body
      // ============================================================================
      const body = await req.json() as { sessionIds?: string[] };
      const sessionIds = body.sessionIds;

      if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'sessionIds array is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Check permissions (developer, owner, admin, location admin)
      // ============================================================================
      const roles = (userPayload as Record<string, unknown>).roles as string[] ?? [];
      const canDelete =
        roles.includes('developer') ||
        roles.includes('owner') ||
        roles.includes('admin') ||
        roles.includes('location admin');

      if (!canDelete) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions to delete sessions' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 3: Delete each session's drive assets, fix supplemental meters,
      //         revert machine state, then bulk-delete documents
      // ============================================================================
      for (const sessionId of sessionIds) {
        const sessionMachines = await ReportedMachine.find({ sessionId })
          .lean<ReportedMachineDocument[]>();

        if (sessionMachines.length === 0) continue;

        await deleteSessionDriveAssets(sessionId);
        await fixSupplementalMetersBeforeDelete(sessionId);
        await revertMachineMetersAfterSessionDelete(sessionId, sessionMachines);
      }

      const deleteResult = await ReportedMachine.deleteMany({
        sessionId: { $in: sessionIds },
      });
      const count = deleteResult.deletedCount;
      await Meters.deleteMany({ locationSession: { $in: sessionIds } });

      // ============================================================================
      // STEP 4: Log activity
      // ============================================================================
      const userId = String((userPayload as Record<string, unknown>)._id ?? '');
      const username = String(
        (userPayload as Record<string, unknown>).emailAddress ?? userId
      );

      await logActivity({
        action: 'DELETE',
        details: `Bulk-deleted ${count} V2 collection session(s)`,
        userId,
        username,
        metadata: {
          userId,
          userEmail: String(
            (userPayload as Record<string, unknown>).emailAddress ?? ''
          ),
          resource: 'collection-report-v2',
          resourceId: sessionIds.join(','),
          resourceName: `${count} session(s)`,
          previousData: { sessionIds },
          changes: [
            {
              field: 'sessionIds',
              oldValue: sessionIds.join(', '),
              newValue: null,
            },
          ],
        },
      }).catch(logError => {
        console.error(
          '[BulkDeleteSessions] Failed to log activity:',
          logError instanceof Error ? logError.message : 'Unknown error'
        );
      });

      const duration = Date.now() - startTime;
      console.log(
        `[${functionName}] Deleted ${count} sessions in ${duration}ms`
      );

      return NextResponse.json({
        success: true,
        data: { count },
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Internal server error';
      console.error(`[${functionName}] Error:`, errorMessage);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}
