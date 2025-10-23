import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to clear user session and cookies
 * Used when database mismatch is detected
 */
export async function POST(_request: NextRequest) {
  try {
    const response = NextResponse.json(
      { success: true, message: "Session cleared successfully" },
      { status: 200 }
    );

    // Clear all authentication cookies
    response.cookies.set("token", "", {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("refreshToken", "", {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("user", "", {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error clearing session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear session" },
      { status: 500 }
    );
  }
}
