import { NextRequest } from 'next/server';
import { MovementRequest } from '@/app/api/lib/models/movementrequests';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '../../lib/helpers/users';
import { getClientIP } from '@/lib/utils/ipAddress';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  if (!id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'MovementRequest ID is required',
      }),
      { status: 400 }
    );
  }
  try {
    // Get movement request data before deletion for logging
    const movementRequestToDelete = await MovementRequest.findById(id);
    if (!movementRequestToDelete) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'MovementRequest not found',
        }),
        { status: 404 }
      );
    }

    await MovementRequest.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );

    // Log activity
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
          userId: currentUser._id as string, // 🔧 FIX: Pass as direct param
          username: (currentUser.emailAddress || currentUser.username || 'unknown') as string, // 🔧 FIX: Pass as direct param
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

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Delete failed',
        error: errorMsg,
      }),
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  if (!id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'MovementRequest ID is required',
      }),
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Invalid JSON in request body',
      }),
      { status: 400 }
    );
  }

  try {
    // Get original movement request data for change tracking
    const originalMovementRequest = await MovementRequest.findById(id);
    if (!originalMovementRequest) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'MovementRequest not found',
        }),
        { status: 404 }
      );
    }

    const updated = await MovementRequest.findOneAndUpdate(
      {
        _id: id,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      },
      body,
      { new: true }
    );

    // 🔧 FIX: Add activity logging for UPDATE
    const currentUser = await getUserFromServer();
    if (currentUser && (currentUser.emailAddress || currentUser.username)) {
      try {
        // Calculate changes between original and updated
        const updateChanges = Object.keys(body)
          .filter(key => String(originalMovementRequest[key as keyof typeof originalMovementRequest]) !== String(body[key as keyof typeof body]))
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

    // Debug logging for troubleshooting
    console.warn('[MOVEMENT REQUESTS API] Update successful:', {
      requestId: id,
      updatedFields: Object.keys(body),
      cabinetIn: updated?.cabinetIn,
    });

    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Update failed',
        error: errorMsg,
      }),
      { status: 500 }
    );
  }
}
