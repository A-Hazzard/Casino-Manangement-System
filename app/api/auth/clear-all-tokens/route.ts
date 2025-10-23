import { NextResponse } from "next/server";

/**
 * Clears all authentication tokens and cookies
 * Useful when database context changes and tokens become invalid
 */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "All tokens cleared successfully. Please login again.",
  });

  // Clear all token-related cookies
  const cookiesToClear = [
    "token",
    "refreshToken",
    "sessionId",
    "user-auth-store", // localStorage key that might be set as cookie
  ];

  cookiesToClear.forEach((cookieName) => {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/",
    });
  });

  return response;
}

/**
 * GET endpoint for easy browser access
 */
export async function GET() {
  return POST();
}
