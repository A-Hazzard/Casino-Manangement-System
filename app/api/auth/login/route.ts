import { NextRequest } from "next/server";
import { authenticateUser } from "@/app/api/lib/helpers/auth";
import { getFriendlyErrorMessage } from "@/lib/utils/auth";
import { getClientIP } from "@/lib/utils/ipAddress";
import { validatePassword } from "@/lib/utils/validation";
import { connectDB } from "@/app/api/lib/middleware/db";
import {
  createSuccessResponse,
  createErrorResponse,
  createBadRequestResponse,
  createServerErrorResponse,
} from "@/app/api/lib/utils/apiResponse";

export const runtime = "nodejs";

/**
 * Enhanced authentication endpoint with rate limiting, session management, and security features.
 *
 * @param request - Incoming request containing credentials and client information
 * @returns JSON response with user data and tokens on success
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { identifier, password, rememberMe } = await request.json();

    if (!identifier || !password) {
      return createBadRequestResponse(
        "Email/username and password are required."
      );
    }

    // Basic input validation
    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const isUsername =
      !isEmail &&
      typeof identifier === "string" &&
      identifier.trim().length >= 3;

    if (!(isEmail || isUsername) || !validatePassword(password)) {
      return createBadRequestResponse("Invalid identifier or password format.");
    }

    // Get client information for enhanced security
    const ipAddress = getClientIP(request) || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const result = await authenticateUser(
      identifier,
      password,
      ipAddress,
      userAgent,
      rememberMe
    );

    if (!result.success) {
      return createErrorResponse(
        result.message || "Authentication failed",
        401
      );
    }

    // Set tokens as HTTP-only cookies
    const response = createSuccessResponse(
      {
        user: result.user,
        expiresAt: result.expiresAt,
      },
      "Login successful"
    );

    // Access token (short-lived for security)
    response.cookies.set("token", result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    // Refresh token (long-lived)
    if (result.refreshToken) {
      response.cookies.set("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days or 7 days
      });
    }

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return createServerErrorResponse(
      getFriendlyErrorMessage(
        error instanceof Error ? error.message : "Login failed"
      )
    );
  }
}
