/**
 * Activity Log by ID API Route
 *
 * Handles deletion of individual activity logs. 
 * Supports both soft and hard delete, restricted to developers.
 *
 * @module app/api/activity-logs/[id]/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE handler for an activity log entry
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    const startTime = Date.now();

    try {
        await connectDB();
        const currentUser = await getUserFromServer();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ success: false, message: 'Activity log ID is required' }, { status: 400 });
        }

        const userRoles = (currentUser.roles as string[]) || [];
        const isDeveloper = userRoles.some(role => role.toLowerCase() === 'developer');

        if (!isDeveloper) {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Only developers can delete activity logs' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const deleteType = (searchParams.get('deleteType') || 'soft') as 'soft' | 'hard';

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
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete activity log';
        console.error(`[Activity Logs [id] API] DELETE error after ${duration}ms:`, errorMessage);
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
