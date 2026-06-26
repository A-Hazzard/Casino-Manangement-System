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

import {
  calculateChanges,
  logActivity,
} from '@/app/api/lib/helpers/activityLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import Scheduler from '@/app/api/lib/models/scheduler';
import type { SchedulerDocument } from '@shared/types';
import {
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

const MANAGE_ROLES = [
  'manager',
  'admin',
  'location admin',
  'owner',
  'developer',
];

type RouteContext = { params: Promise<{ schedulerId: string }> };

// ============================================================================
// PATCH — Edit schedule fields
// ============================================================================
/**
 * PATCH /api/schedulers/[schedulerId]
 *
 * Updates one or more fields on an existing schedule. Only provided fields are
 * applied; at least one field must be included. Requires manager, admin,
 * location admin, owner, or developer role.
 *
 * Path params:
 * @param {string} schedulerId - Required. The ID of the schedule to update.
 *
 * Body fields:
 * @param {string} [startTime] - Optional. ISO 8601 date-time string for the new start time.
 * @param {string} [endTime] - Optional. ISO 8601 date-time string for the new end time.
 * @param {string} [status] - Optional. New status value for the schedule.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const timerStart = Date.now();
  const functionName = 'PATCH /api/schedulers/[schedulerId]';
  const logUser = extractUserFromRequest(request);

  return withApiAuth(request, async ({ userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Role check
      // ============================================================================
      if (!userRoles.some((role: string) => MANAGE_ROLES.includes(role))) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Insufficient permissions',
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Parse request body
      // ============================================================================
      const { schedulerId } = await context.params;
      const body = await request.json();
      const { startTime, endTime, status } = body as {
        startTime?: string;
        endTime?: string;
        status?: string;
      };

      // ============================================================================
      // STEP 3: Build update data
      // ============================================================================
      const updateData: Record<string, unknown> = {};
      if (startTime) updateData.startTime = new Date(startTime);
      if (endTime) updateData.endTime = new Date(endTime);
      if (status) updateData.status = status;

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No fields to update',
            message: 'Provide at least one field to update',
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 4: Fetch existing scheduler
      // ============================================================================
      const existingScheduler = await Scheduler.findOne({
        _id: schedulerId,
        deletedAt: { $exists: false },
      }).lean<SchedulerDocument>();
      if (!existingScheduler) {
        return NextResponse.json(
          {
            success: false,
            error: 'Not found',
            message: 'Schedule not found',
            timestamp: new Date().toISOString(),
          },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 5: Update scheduler
      // ============================================================================
      const updated = await Scheduler.findOneAndUpdate(
        { _id: schedulerId, deletedAt: { $exists: false } },
        { $set: updateData },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            error: 'Not found',
            message: 'Schedule not found',
            timestamp: new Date().toISOString(),
          },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 6: Log activity
      // ============================================================================
      const user = await getUserFromServer();
      logActivity({
        action: 'update',
        details: `Schedule ${schedulerId} updated`,
        userId: String(user?._id ?? ''),
        username: String(
          (user as unknown as Record<string, unknown>)?.emailAddress ||
            (user as unknown as Record<string, unknown>)?.username ||
            user?._id
        ),
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
      }).catch(err =>
        console.error('[Scheduler PATCH] Activity log failed:', err)
      );

      // ============================================================================
      // STEP 7: Return success response
      // ============================================================================
      const duration = Date.now() - timerStart;
      if (duration > 1000) {
        console.warn(`[Scheduler PATCH] slow: ${duration}ms`);
      }
      logRouteUpdate(
        functionName,
        'PATCH',
        '/api/schedulers/[schedulerId]',
        1,
        logUser,
        duration
      );

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Schedule updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logRouteError(
        functionName,
        'PATCH',
        '/api/schedulers/[schedulerId]',
        msg,
        logUser
      );
      console.error('[Scheduler PATCH] Error:', msg);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update schedule',
          message: msg,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  });
}

// ============================================================================
// DELETE — Soft-delete (sets deletedAt)
// ============================================================================
/**
 * DELETE /api/schedulers/[schedulerId]
 *
 * Soft-deletes a schedule by setting its `deletedAt` timestamp. The record is
 * retained in the database but excluded from all active queries. Requires
 * manager, admin, location admin, owner, or developer role.
 *
 * Path params:
 * @param {string} schedulerId - Required. The ID of the schedule to delete.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/schedulers/[schedulerId]';
  const logUser = extractUserFromRequest(_request);

  return withApiAuth(_request, async ({ userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Role check
      // ============================================================================
      if (!userRoles.some((role: string) => MANAGE_ROLES.includes(role))) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Insufficient permissions',
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Parse request
      // ============================================================================
      const { schedulerId } = await context.params;

      // ============================================================================
      // STEP 3: Soft delete scheduler
      // ============================================================================
      const updated = await Scheduler.findOneAndUpdate(
        { _id: schedulerId, deletedAt: { $exists: false } },
        { $set: { deletedAt: new Date() } },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            error: 'Not found',
            message: 'Schedule not found or already deleted',
            timestamp: new Date().toISOString(),
          },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 4: Log activity
      // ============================================================================
      const user = await getUserFromServer();
      logActivity({
        action: 'delete',
        details: `Schedule ${schedulerId} deleted`,
        userId: String(user?._id ?? ''),
        username: String(
          (user as unknown as Record<string, unknown>)?.emailAddress ||
            (user as unknown as Record<string, unknown>)?.username ||
            user?._id
        ),
        metadata: {
          resource: 'scheduler',
          resourceId: schedulerId,
          resourceName: `Schedule ${schedulerId}`,
        },
      }).catch(err =>
        console.error('[Scheduler DELETE] Activity log failed:', err)
      );

      // ============================================================================
      // STEP 5: Return success response
      // ============================================================================
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[Scheduler DELETE] slow: ${duration}ms`);
      }
      logRouteDelete(
        functionName,
        'DELETE',
        '/api/schedulers/[schedulerId]',
        1,
        logUser,
        duration
      );

      return NextResponse.json({
        success: true,
        data: null,
        message: 'Schedule deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logRouteError(
        functionName,
        'DELETE',
        '/api/schedulers/[schedulerId]',
        msg,
        logUser
      );
      console.error('[Scheduler DELETE] Error:', msg);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete schedule',
          message: msg,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  });
}
