/**
 * Scheduler [schedulerId] API Route
 *
 * PATCH  — Edit a schedule's startTime, endTime, or status.
 * DELETE — Soft-delete a schedule (sets deletedAt timestamp).
 *
 * Access: manager, admin, location admin, owner, developer
 *
 * @module app/api/schedulers/[schedulerId]/route
 */

import { calculateChanges, logActivity } from '@/app/api/lib/helpers/activityLogger';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import Scheduler from '@/app/api/lib/models/scheduler';
import { NextRequest, NextResponse } from 'next/server';

const MANAGE_ROLES = ['manager', 'admin', 'location admin', 'owner', 'developer'];

type RouteContext = { params: Promise<{ schedulerId: string }> };

// ============================================================================
// PATCH — Edit schedule fields
// ============================================================================
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    // Auth + role check
    const user = await getUserFromServer();
    const userRoles = (user?.roles as string[]) || [];
    if (!user || !userRoles.some((r: string) => MANAGE_ROLES.includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Insufficient permissions', timestamp: new Date().toISOString() },
        { status: 403 }
      );
    }

    const { schedulerId } = await context.params;
    const body = await request.json();
    const { startTime, endTime, status } = body as {
      startTime?: string;
      endTime?: string;
      status?: string;
    };

    // Build update — only include provided fields
    const updateData: Record<string, unknown> = {};
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update', message: 'Provide at least one field to update', timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    console.log(`[Scheduler PATCH] Request — schedulerId: ${schedulerId}, fields: ${Object.keys(updateData).join(', ')}`);

    // Pre-fetch for before-state
    const existingScheduler = await Scheduler.findOne({ _id: schedulerId, deletedAt: { $exists: false } }).lean();
    if (!existingScheduler) {
      return NextResponse.json(
        { success: false, error: 'Not found', message: 'Schedule not found', timestamp: new Date().toISOString() },
        { status: 404 }
      );
    }

    const updated = await Scheduler.findOneAndUpdate(
      { _id: schedulerId, deletedAt: { $exists: false } },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Not found', message: 'Schedule not found', timestamp: new Date().toISOString() },
        { status: 404 }
      );
    }

    console.log(`[Scheduler PATCH] Updated scheduler ${schedulerId}`);
    logActivity({
      action: 'update',
      details: `Schedule ${schedulerId} updated`,
      userId: String(user._id),
      username: String((user as Record<string, unknown>).emailAddress || (user as Record<string, unknown>).username || user._id),
      metadata: {
        resource: 'scheduler',
        resourceId: schedulerId,
        resourceName: `Schedule ${schedulerId}`,
        changes: calculateChanges(
          existingScheduler as Record<string, unknown>,
          updateData
        ),
        previousData: existingScheduler,
        newData: updated.toObject(),
      },
    }).catch(err => console.error('[Scheduler PATCH] Activity log failed:', err));

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Schedule updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scheduler PATCH] Error:', msg);
    return NextResponse.json(
      { success: false, error: 'Failed to update schedule', message: msg, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE — Soft-delete (sets deletedAt)
// ============================================================================
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    // Auth + role check
    const user = await getUserFromServer();
    const userRoles = (user?.roles as string[]) || [];
    if (!user || !userRoles.some((r: string) => MANAGE_ROLES.includes(r))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Insufficient permissions', timestamp: new Date().toISOString() },
        { status: 403 }
      );
    }

    const { schedulerId } = await context.params;

    console.log(`[Scheduler DELETE] Request — schedulerId: ${schedulerId}`);

    const updated = await Scheduler.findOneAndUpdate(
      { _id: schedulerId, deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Not found', message: 'Schedule not found or already deleted', timestamp: new Date().toISOString() },
        { status: 404 }
      );
    }

    console.log(`[Scheduler DELETE] Soft-deleted scheduler ${schedulerId}`);
    logActivity({
      action: 'delete',
      details: `Schedule ${schedulerId} deleted`,
      userId: String(user._id),
      username: String((user as Record<string, unknown>).emailAddress || (user as Record<string, unknown>).username || user._id),
      metadata: {
        resource: 'scheduler',
        resourceId: schedulerId,
        resourceName: `Schedule ${schedulerId}`,
      },
    }).catch(err => console.error('[Scheduler DELETE] Activity log failed:', err));

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Schedule deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scheduler DELETE] Error:', msg);
    return NextResponse.json(
      { success: false, error: 'Failed to delete schedule', message: msg, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
