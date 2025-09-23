import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import User from "@/app/api/lib/models/user";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    
    if (!username) {
      return NextResponse.json(
        { success: false, message: "Username is required" },
        { status: 400 }
      );
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: username },
        { emailAddress: username }
      ]
    });
    
    return NextResponse.json({
      success: true,
      exists: !!existingUser
    });
    
  } catch (error) {
    console.error("Error checking username:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
