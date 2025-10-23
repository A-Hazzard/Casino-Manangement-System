import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getUserById, getUserIdFromServer } from "@/app/api/lib/helpers/users";

/**
 * GET /api/auth/current-user
 * Fetches the current user's data from the database
 * Used for permission checks and role validation
 */
export async function GET(_request: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = await getUserIdFromServer();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Fetch user from database with all current data
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return the current user data from database

    return NextResponse.json({
      success: true,
      user: {
        id: user._id?.toString() || "",
        username: user.username || "",
        emailAddress: user.emailAddress || "",
        profile: user.profile || {},
        roles: user.roles || [],
        isEnabled: user.isEnabled ?? true,
        resourcePermissions: user.resourcePermissions || {},
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date(),
      },
    });
  } catch (error) {
    console.error(" Error fetching current user:", error);
    console.error(" Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
