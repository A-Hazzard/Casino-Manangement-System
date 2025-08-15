import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { ActivityLog } from "@/app/api/lib/models/activityLog";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      action,
      resource,
      resourceId,
      resourceName,
      details,
      previousData,
      newData,
      ipAddress,
      userAgent,
    } = body;

    // Get user information from session/token if available
    // For now, we'll use a placeholder - in a real app, you'd extract this from JWT
    const userId = "current-user-id"; // This should come from authentication
    const username = "current-user"; // This should come from authentication

    // Get client IP from headers
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      ipAddress ||
      "unknown";

    // Create activity log entry
    const activityLog = new ActivityLog({
      userId,
      username,
      action,
      resource,
      resourceId,
      resourceName,
      details,
      previousData,
      newData,
      ipAddress: clientIP,
      userAgent: userAgent || request.headers.get("user-agent"),
      timestamp: new Date(),
    });

    await activityLog.save();

    return NextResponse.json(
      {
        success: true,
        message: "Activity logged successfully",
        activityId: activityLog._id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error logging activity:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to log activity",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const userId = searchParams.get("userId");
    const resource = searchParams.get("resource");
    const action = searchParams.get("action");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query
    const query: any = {};

    if (userId) {
      query.userId = userId;
    }

    if (resource) {
      query.resource = resource;
    }

    if (action) {
      query.action = action;
    }

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get total count
    const totalCount = await ActivityLog.countDocuments(query);

    // Get paginated results
    const activities = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch activity logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
