import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "@/lib/utils/user";
import { getClientIP } from "@/lib/utils/ipAddress";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromServer();
    console.warn("Test - Current user:", currentUser);
    
    if (currentUser && currentUser.emailAddress) {
      try {
        console.warn("Test - Attempting to log activity...");
        const logResult = await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "DOWNLOAD",
          "Firmware",
          { id: "test-id", name: "Test Firmware v1.0" },
          [
            { field: "fileName", oldValue: null, newValue: "test.bin" },
            { field: "fileSize", oldValue: null, newValue: 1024 },
            { field: "product", oldValue: null, newValue: "Test Product" },
            { field: "version", oldValue: null, newValue: "1.0" },
          ],
          `Test download activity log`,
          getClientIP(request) || undefined
        );
        console.warn("Test - Activity log result:", logResult);
        return NextResponse.json({ success: true, logResult });
      } catch (logError) {
        console.error("Test - Failed to log activity:", logError);
        const errorMessage = logError instanceof Error ? logError.message : "Unknown error occurred";
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
      }
    } else {
      console.warn("Test - No current user found");
      return NextResponse.json({ success: false, error: "No user found" }, { status: 401 });
    }
  } catch (error) {
    console.error("Test - Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
