import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/app/api/lib/helpers/auth";
import { getFriendlyErrorMessage } from "@/lib/utils/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    // If no refresh token in body, try to get it from cookies
    let tokenToUse = refreshToken;
    if (!tokenToUse || tokenToUse === "auto") {
      const cookies = request.cookies.get("refreshToken");
      tokenToUse = cookies?.value;
    }

    if (!tokenToUse) {
      return NextResponse.json(
        { success: false, message: "Refresh token is required." },
        { status: 400 }
      );
    }

    const result = await refreshAccessToken(tokenToUse);

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    // Set new access token as HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
    });

    response.cookies.set("token", result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 60 minutes (1 hour)
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        message: getFriendlyErrorMessage(
          error instanceof Error ? error.message : "Token refresh failed"
        ),
      },
      { status: 500 }
    );
  }
}
