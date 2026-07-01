/**
 * Activity Logs Bulk Delete API Route
 *
 * Deletes multiple activity log entries in one request. Supports soft delete
 * (sets deletedAt) or hard delete (permanent removal). Restricted to
 * developers and admins.
 *
 * @module app/api/activity-logs/bulk-delete/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import {
  extractUserFromRequest,
  logRouteDelete,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

type BulkDeleteBody = {
  ids?: string[];
  deleteType?: 'soft' | 'hard';
};

/**
 * POST /api/activity-logs/bulk-delete
 *
 * Flow:
 * 1. Parse and validate request body
 * 2. Authenticate and verify developer/admin role
 * 3. Soft-delete or hard-delete matching activity logs
 */
export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const functionName = 'POST /api/activity-logs/bulk-delete';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ isAdminOrDev, userRoles }) => {
    // ============================================================================
    // STEP 1: Parse and validate request body
    // ============================================================================
    const body = (await request.json()) as BulkDeleteBody;
    const ids = body.ids;
    const deleteType = body.deleteType === 'hard' ? 'hard' : 'soft';

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      logRouteError(
        functionName,
        'POST',
        '/api/activity-logs/bulk-delete',
        'ids array is required',
        user
      );
      return NextResponse.json(
        { success: false, message: 'ids array is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Authenticate and check permissions
    // ============================================================================
    const isDeveloper = userRoles.some(
      role => role.toLowerCase() === 'developer'
    );
    if (!isDeveloper && !isAdminOrDev) {
      logRouteError(
        functionName,
        'POST',
        '/api/activity-logs/bulk-delete',
        'Forbidden - developer or admin role required',
        user
      );
      return NextResponse.json(
        {
          success: false,
          message: 'Forbidden: Only developers and admins can delete activity logs',
        },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 3: Delete activity logs
    // ============================================================================
    let deletedCount = 0;

    if (deleteType === 'hard') {
      const deleteResult = await ActivityLog.deleteMany({ _id: { $in: ids } });
      deletedCount = deleteResult.deletedCount ?? 0;
    } else {
      const updateResult = await ActivityLog.updateMany(
        { _id: { $in: ids } },
        { deletedAt: new Date() }
      );
      deletedCount = updateResult.modifiedCount ?? 0;
    }

    if (deletedCount === 0) {
      logRouteError(
        functionName,
        'POST',
        '/api/activity-logs/bulk-delete',
        'No activity logs found for provided ids',
        user
      );
      return NextResponse.json(
        { success: false, message: 'No activity logs found' },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[${functionName}] slow: ${duration}ms`);
    }
    logRouteDelete(
      functionName,
      'POST',
      '/api/activity-logs/bulk-delete',
      deletedCount,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data: { deletedCount, deleteType },
    });
  });
}
