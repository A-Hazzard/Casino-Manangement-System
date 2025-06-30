import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/app/api/lib/helpers/auth";
import { validateEmail, validatePassword } from "@/app/api/lib/utils/validation";
import { connectDB } from "@/app/api/lib/middleware/db";
import type { LoginRequestBody, AuthResult } from "@/app/api/lib/types";

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
        const { emailAddress, password } = (await request.json()) as LoginRequestBody;

        if (!validateEmail(emailAddress) || !validatePassword(password)) {
            return NextResponse.json(
                { success: false, message: "Invalid email address or password format." },
                { status: 400 }
            );
        }

        const result: AuthResult = await authenticateUser(emailAddress, password);
        if (!result.success || !result.user || !result.token) {
            return NextResponse.json(
                { success: false, message: result.message || "Invalid credentials." },
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