import { NextRequest, NextResponse } from "next/server";
import { getUserFromServer } from "@/app/api/lib/helpers/users";
import { connectDB } from "@/app/api/lib/middleware/db";
import { ActivityLog } from "@/app/api/lib/models/activityLog";

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
    const action = searchParams.get("action");
    const success = searchParams.get("success");
    const timeRange = searchParams.get("timeRange") || "24h";
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Calculate date range
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

    // Build query filters
    const filters: Record<string, unknown> = {
      timestamp: { $gte: startDate },
    };

    if (action && action !== "all") {
      if (action === "token_refresh") {
        filters.action = {
          $in: ["token_refresh_success", "token_refresh_failed"],
        };
      } else {
        filters.action = action;
      }
    }

    if (success && success !== "all") {
      filters.success = success === "true";
    }

    if (search) {
      filters.$or = [
        { email: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
      ];
    }

    // Query actual data using ActivityLog model
    const skip = (page - 1) * limit;

    const events = await ActivityLog.find(filters)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v")
      .lean();

    const total = await ActivityLog.countDocuments(filters);

    return NextResponse.json({
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch auth events:", error);
    return NextResponse.json(
      { error: "Failed to fetch authentication events" },
      { status: 500 }
    );
  }
}
