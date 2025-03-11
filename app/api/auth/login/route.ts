import { NextResponse } from "next/server";
import { authenticateUser } from "@/app/api/lib/helpers/auth";
import { validateEmail, validatePassword } from "@/app/api/lib/utils/validation";
import { connectDB } from "@/app/api/lib/middleware/db";

export const runtime = "nodejs"; // Force Next.js to use Node.js runtime

export async function POST(request: Request) {
    try {
        await connectDB();
        const { emailAddress, password } = await request.json();

        if (!validateEmail(emailAddress) || !validatePassword(password)) {
            return NextResponse.json(
                { success: false, message: "Invalid email address or password format." },
                { status: 400 }
            );
        }

        const result = await authenticateUser(emailAddress, password);
        if (result.success) {
            console.log(`Login successful for user ${emailAddress}`);
            const response = NextResponse.json({
                success: true,
                message: "Login successful",
                token: result.token,
            });

            response.cookies.set("token", result.token || "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 172800,
                path: "/",
            });

            return response;
        } else {
            return NextResponse.json(
                { success: false, message: result.message || "Invalid credentials." },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error("Login API error:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}