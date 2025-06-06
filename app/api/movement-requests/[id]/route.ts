import { NextRequest } from "next/server";
import { MovementRequest } from "@/app/api/lib/models/movementrequests";

export async function DELETE(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const { _id } = body;
  if (!_id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "MovementRequest ID is required",
      }),
      { status: 400 }
    );
  }
  try {
    const deleted = await MovementRequest.findByIdAndDelete(_id);
    if (!deleted) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "MovementRequest not found",
        }),
        { status: 404 }
      );
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

export async function PATCH(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const { _id, ...updateFields } = body;
  if (!_id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "MovementRequest ID is required",
      }),
      { status: 400 }
    );
  }
  try {
    const updated = await MovementRequest.findByIdAndUpdate(_id, updateFields, {
      new: true,
    });
    if (!updated) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "MovementRequest not found",
        }),
        { status: 404 }
      );
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
