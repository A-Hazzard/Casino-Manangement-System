import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { updateUser as updateUserHelper, getUserById } from "@/app/api/lib/helpers/users";
import { apiLogger } from "@/app/api/lib/utils/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const resolvedParams = await params;
  const context = apiLogger.createContext(request, `/api/users/${resolvedParams.id}`);
  apiLogger.startLogging();

  try {
    await connectDB();
    const userId = resolvedParams.id;

    if (!userId) {
      apiLogger.logError(context, "User fetch failed", "User ID is required");
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      apiLogger.logError(context, "User fetch failed", "User not found");
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    apiLogger.logSuccess(context, `Successfully fetched user ${userId}`);
    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    apiLogger.logError(context, "User fetch failed", errorMsg);
    return NextResponse.json(
      {
        success: false,
        message: errorMsg === "User not found" ? errorMsg : "Failed to fetch user",
        error: errorMsg,
      },
      { status: errorMsg === "User not found" ? 404 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const resolvedParams = await params;
  const context = apiLogger.createContext(request, `/api/users/${resolvedParams.id}`);
  apiLogger.startLogging();

  try {
    await connectDB();
    const body = await request.json();
    const { _id, ...updateFields } = body;

    // Use the ID from the URL parameter
    const userId = resolvedParams.id;

    if (!userId) {
      apiLogger.logError(context, "User update failed", "User ID is required");
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserHelper(userId, updateFields, request);
    apiLogger.logSuccess(context, `Successfully updated user ${userId}`);
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    apiLogger.logError(context, "User update failed", errorMsg);
    return NextResponse.json(
      {
        success: false,
        message: errorMsg === "User not found" ? errorMsg : "Update failed",
        error: errorMsg,
      },
      { status: errorMsg === "User not found" ? 404 : 500 }
    );
  }
}
