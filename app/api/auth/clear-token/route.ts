import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Token cleared successfully. Please login again.",
  });

  // Clear the token cookie completely
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Consistent with login cookie settings
    maxAge: 0, // Expire immediately
    path: "/",
  });

  return response;
}
