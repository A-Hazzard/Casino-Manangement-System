import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/helpers/auth";
import { validatePassword } from "@/lib/utils/validation";
import { connectDB } from "@/app/api/lib/middleware/db";
import type { LoginRequestBody, AuthResult } from "@/shared/types";

export const runtime = "nodejs";

/**
 * Authenticates a user and issues an HTTP-only token cookie.
 *
 * @param request - Incoming request containing email and password
 * @returns JSON response with user and token on success
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { identifier, password } = (await request.json()) as LoginRequestBody;

    // Accept either valid email or a username with basic constraints
    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const isUsername =
      !isEmail &&
      typeof identifier === "string" &&
      identifier.trim().length >= 3;
    if (!(isEmail || isUsername) || !validatePassword(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid identifier or password format.",
        },
        { status: 400 }
      );
    }

    const result: AuthResult = await authenticateUser(identifier, password);
    if (!result.success || !result.user || !result.token) {
      // Provide more specific error messages based on the authentication result
      let errorMessage = "Invalid credentials.";

      if (result.message === "User not found.") {
        errorMessage =
          "No account found with this email/username. Please check your credentials or create an account.";
      } else if (result.message === "Incorrect password.") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (result.message) {
        errorMessage = result.message;
      }

      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: result.user,
      token: result.token,
    });

    response.cookies.set("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Allow cross-site requests for IP addresses
      maxAge: 172800, // 48 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
