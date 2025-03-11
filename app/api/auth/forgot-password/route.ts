import { NextResponse } from "next/server"
import { sendResetPasswordEmail } from "../../lib/helpers/auth"
import { validateEmail } from "../../lib/utils/validation"
import { connectDB } from "../../lib/middleware/db"

export async function POST(request: Request) {
    await connectDB()
    const { email } = await request.json()

    if (!validateEmail(email)) {
        return NextResponse.json(
            { success: false, message: "Invalid email format." },
            { status: 400 }
        )
    }

    const result = await sendResetPasswordEmail(email)
    if (result.success) {
        return NextResponse.json({
            success: true,
            message: "Reset instructions sent.",
        })
    } else {
        return NextResponse.json(
            { success: false, message: result.message || "Failed to send email." },
            { status: 500 }
        )
    }
}
