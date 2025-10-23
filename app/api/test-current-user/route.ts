import { NextResponse } from "next/server";
import { getUserIdFromServer } from "@/app/api/lib/helpers/users";

export const runtime = "nodejs";

/**
 * Test endpoint to verify that authentication tokens are properly set
 * Used during login to confirm cookies are working before showing success message
 *
 * @returns JSON response with userId if authenticated, or error if not
 */
export async function GET() {
  try {
    console.warn("🔍 [TEST-CURRENT-USER] Verifying token from cookies...");

    // Get user ID from the token cookie
    const userId = await getUserIdFromServer();

    console.warn("🔍 [TEST-CURRENT-USER] getUserIdFromServer result:", {
      userId: userId || "null",
      hasUserId: !!userId,
    });

    if (!userId) {
      console.warn("❌ [TEST-CURRENT-USER] No valid token found");
      return NextResponse.json(
        {
          success: false,
          message: "No valid authentication token found",
          userId: null,
        },
        { status: 401 }
      );
    }

    console.warn("✅ [TEST-CURRENT-USER] Token valid, userId:", userId);

    // Return success with the userId
    return NextResponse.json(
      {
        success: true,
        message: "Token verified successfully",
        userId: userId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ [TEST-CURRENT-USER] Token verification error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Token verification failed",
        userId: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
