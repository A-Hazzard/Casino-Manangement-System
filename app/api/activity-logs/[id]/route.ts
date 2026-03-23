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
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE handler for an activity log entry
 */
export async function DELETE(
  request: NextRequest
): Promise<Response> {
  return withApiAuth(request, async ({ isAdminOrDev, userRoles }) => {
    const { pathname } = request.nextUrl;
    const id = pathname.split('/').pop();
    if (!id)
      return NextResponse.json(
        { success: false, message: 'Activity log ID is required' },
        { status: 400 }
      );

    const isDeveloper = userRoles.some(
      role => role.toLowerCase() === 'developer'
    );
    if (!isDeveloper && !isAdminOrDev) {
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
      await ActivityLog.deleteOne({ _id: id });
    } else {
      await ActivityLog.findOneAndUpdate(
        { _id: id },
        { deletedAt: new Date() },
        { new: true }
      );
    }

    return NextResponse.json({ success: true });
  });
}
