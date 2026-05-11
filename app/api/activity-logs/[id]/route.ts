/**
 * Activity Log by ID API Route
 *
 * Handles deletion of individual activity logs.
 * Supports both soft and hard delete, restricted to developers.
 *
 * @module app/api/activity-logs/[id]/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import {
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/activity-logs/[id]
 *
 * Deletes a single activity log entry by ID. Restricted to developers only.
 * Soft delete sets `deletedAt`; hard delete permanently removes the document.
 *
 * Path params:
 * @param id         {string}  Required. The ID of the activity log entry to delete.
 *
 * Query params:
 * @param deleteType {string}  Optional. 'soft' (default) or 'hard'. Hard delete is permanent and requires developer role.
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const functionName = 'DELETE /api/activity-logs/[id]';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ isAdminOrDev, userRoles }) => {
    const { pathname } = request.nextUrl;
    const id = pathname.split('/').pop();
    if (!id) {
      logRouteError(
        functionName,
        'DELETE',
        '/api/activity-logs/[id]',
        'Activity log ID is required',
        user
      );
      return NextResponse.json(
        { success: false, message: 'Activity log ID is required' },
        { status: 400 }
      );
    }

    const isDeveloper = userRoles.some(
      role => role.toLowerCase() === 'developer'
    );
    if (!isDeveloper && !isAdminOrDev) {
      logRouteError(
        functionName,
        'DELETE',
        '/api/activity-logs/[id]',
        'Forbidden - developer role required',
        user
      );
      return NextResponse.json(
        {
          success: false,
          message: 'Forbidden: Only developers can delete activity logs',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deleteType = (searchParams.get('deleteType') || 'soft') as
      | 'soft'
      | 'hard';

    if (deleteType === 'hard') {
      const deleteResult = await ActivityLog.deleteOne({ _id: id });
      if (deleteResult.deletedCount === 0) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/activity-logs/[id]',
          `Activity log not found: ${id}`,
          user
        );
        return NextResponse.json(
          { success: false, message: 'Activity log not found' },
          { status: 404 }
        );
      }
    } else {
      const updateResult = await ActivityLog.findOneAndUpdate(
        { _id: id },
        { deletedAt: new Date() },
        { new: true }
      );
      if (!updateResult) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/activity-logs/[id]',
          `Activity log not found: ${id}`,
          user
        );
        return NextResponse.json(
          { success: false, message: 'Activity log not found' },
          { status: 404 }
        );
      }
    }

    const duration = Date.now() - startTime;
    logRouteDelete(
      functionName,
      'DELETE',
      '/api/activity-logs/[id]',
      1,
      user,
      duration
    );

    return NextResponse.json({ success: true });
  });
}
