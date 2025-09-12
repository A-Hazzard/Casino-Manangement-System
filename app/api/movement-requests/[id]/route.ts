import { NextRequest } from "next/server";
import { MovementRequest } from "@/app/api/lib/models/movementrequests";
import { logActivity, calculateChanges } from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "@/lib/utils/user";
import { getClientIP } from "@/lib/utils/ipAddress";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  if (!id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "MovementRequest ID is required",
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
          message: "MovementRequest not found",
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
          { field: "cabinetIn", oldValue: movementRequestToDelete.cabinetIn, newValue: null },
          { field: "locationFrom", oldValue: movementRequestToDelete.locationFrom, newValue: null },
          { field: "locationTo", oldValue: movementRequestToDelete.locationTo, newValue: null },
          { field: "reason", oldValue: movementRequestToDelete.reason, newValue: null },
          { field: "status", oldValue: movementRequestToDelete.status, newValue: null },
        ];

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "DELETE",
          "machine",
          { id, name: `Cabinet ${movementRequestToDelete.cabinetIn}` },
          deleteChanges,
          `Deleted movement request for cabinet ${movementRequestToDelete.cabinetIn} from ${movementRequestToDelete.locationFrom} to ${movementRequestToDelete.locationTo}`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        message: "Delete failed",
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
        message: "MovementRequest ID is required",
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
        message: "Invalid JSON in request body",
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
          message: "MovementRequest not found",
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

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const changes = calculateChanges(originalMovementRequest.toObject(), body);

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "UPDATE",
          "machine",
          { id, name: `Cabinet ${originalMovementRequest.cabinetIn}` },
          changes,
          `Updated movement request for cabinet ${originalMovementRequest.cabinetIn} from ${originalMovementRequest.locationFrom} to ${originalMovementRequest.locationTo}`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        message: "Update failed",
        error: errorMsg,
      }),
      { status: 500 }
    );
  }
}
