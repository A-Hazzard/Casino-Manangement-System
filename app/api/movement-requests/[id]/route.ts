/**
 * Movement Request by ID API Route
 *
 * This route handles operations for a specific movement request identified by ID.
 * It supports:
 * - DELETE: Soft deleting a movement request
 * - PATCH: Updating a movement request
 *
 * @module app/api/movement-requests/[id]/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { MovementRequest } from '@/app/api/lib/models/movementrequests';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main DELETE handler for soft deleting a movement request
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Find movement request by ID
 * 3. Soft delete movement request
 * 4. Log activity
 * 5. Return success response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'MovementRequest ID is required',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Find movement request by ID
    // ============================================================================
    const movementRequestToDelete = await MovementRequest.findOne({ _id: id });
    if (!movementRequestToDelete) {
      return NextResponse.json(
        {
          success: false,
          message: 'MovementRequest not found',
        },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 3: Soft delete movement request
    // ============================================================================
    await MovementRequest.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date() },
      { new: true }
    );

    // ============================================================================
    // STEP 4: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const deleteChanges = [
          {
            field: 'cabinetIn',
            oldValue: movementRequestToDelete.cabinetIn,
            newValue: null,
          },
          {
            field: 'locationFrom',
            oldValue: movementRequestToDelete.locationFrom,
            newValue: null,
          },
          {
            field: 'locationTo',
            oldValue: movementRequestToDelete.locationTo,
            newValue: null,
          },
          {
            field: 'reason',
            oldValue: movementRequestToDelete.reason,
            newValue: null,
          },
          {
            field: 'status',
            oldValue: movementRequestToDelete.status,
            newValue: null,
          },
        ];

        await logActivity({
          action: 'DELETE',
          details: `Deleted movement request for cabinet ${movementRequestToDelete.cabinetIn} from ${movementRequestToDelete.locationFrom} to ${movementRequestToDelete.locationTo}`,
          userId: currentUser._id as string,
          username: (currentUser.emailAddress || currentUser.username || 'unknown') as string,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'movement_request',
            resourceId: id,
            resourceName: `Cabinet ${movementRequestToDelete.cabinetIn}`,
            changes: deleteChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Movement Requests [id] API] Completed in ${duration}ms`);
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(
      `[Movement Request DELETE API] Error after ${duration}ms:`,
      errorMsg
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Delete failed',
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}

/**
 * Main PATCH handler for updating a movement request
 *
 * Flow:
 * 1. Parse and validate request parameters and body
 * 2. Find original movement request
 * 3. Update movement request
 * 4. Log activity
 * 5. Return updated request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters and body
    // ============================================================================
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'MovementRequest ID is required',
        },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Find original movement request
    // ============================================================================
    const originalMovementRequest = await MovementRequest.findOne({ _id: id });
    if (!originalMovementRequest) {
      return NextResponse.json(
        {
          success: false,
          message: 'MovementRequest not found',
        },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 3: Update movement request
    // ============================================================================
    const updated = await MovementRequest.findOneAndUpdate(
      {
        _id: id,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      },
      body,
      { new: true }
    );

    // ============================================================================
    // STEP 4: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && (currentUser.emailAddress || currentUser.username)) {
      try {
        const updateChanges = Object.keys(body)
          .filter(
            key =>
              String(originalMovementRequest[key as keyof typeof originalMovementRequest]) !==
              String(body[key as keyof typeof body])
          )
          .map(key => ({
            field: key,
            oldValue: originalMovementRequest[key as keyof typeof originalMovementRequest],
            newValue: body[key as keyof typeof body],
          }));

        await logActivity({
          action: 'UPDATE',
          details: `Updated movement request for cabinet ${body.cabinetIn || originalMovementRequest.cabinetIn}`,
          userId: currentUser._id as string,
          username: (currentUser.emailAddress || currentUser.username || 'unknown') as string,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'movement_request',
            resourceId: id,
            resourceName: `Cabinet ${body.cabinetIn || originalMovementRequest.cabinetIn}`,
            changes: updateChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 5: Return updated request
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Movement Requests [id] PATCH API] Completed in ${duration}ms`);
    }
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(
      `[Movement Request PATCH API] Error after ${duration}ms:`,
      errorMsg
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Update failed',
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
