import { NextRequest, NextResponse } from "next/server";
import { getUserFromServer } from "@/app/api/lib/helpers/users";
import { connectDB } from "@/app/api/lib/middleware/db";
import { ActivityLog } from "@/app/api/lib/models/activityLog";
import User from "@/app/api/lib/models/user";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Check authentication and authorization
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - User not found" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "24h";

    // Calculate date range for filtering
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "1h":
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "24h":
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    // Query actual data using ActivityLog model
    const totalLogins = await ActivityLog.countDocuments({
      action: { $in: ["create", "update", "delete", "view", "download"] },
      timestamp: { $gte: startDate },
    });

    const successfulLogins = await ActivityLog.countDocuments({
      action: "create",
      resource: "user",
      timestamp: { $gte: startDate },
    });

    const failedLogins = await ActivityLog.countDocuments({
      action: "update",
      resource: "user",
      details: { $regex: "failed", $options: "i" },
      timestamp: { $gte: startDate },
    });

    const suspiciousActivities = await ActivityLog.countDocuments({
      details: { $regex: "suspicious|security|breach", $options: "i" },
      timestamp: { $gte: startDate },
    });

    // Get locked accounts count
    const lockedAccounts = await User.countDocuments({
      isLocked: true,
      lockedUntil: { $gt: new Date() },
    });

    // Get active sessions count (approximate based on recent activity)
    const activeSessions = await ActivityLog.countDocuments({
      timestamp: { $gte: new Date(now.getTime() - 30 * 60 * 1000) }, // Last 30 minutes
    });

    const metrics = {
      totalLogins,
      successfulLogins,
      failedLogins,
      activeSessions,
      lockedAccounts,
      suspiciousActivities,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to fetch auth metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch authentication metrics" },
      { status: 500 }
    );
  }
}
