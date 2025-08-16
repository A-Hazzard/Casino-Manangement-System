import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { ActivityLog } from "@/app/api/lib/models/activityLog";
import { apiLogger } from "@/app/api/lib/utils/logger";

export async function POST(request: NextRequest) {
  const context = apiLogger.createContext(request, "/api/activity-logs");
  apiLogger.startLogging();

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

    apiLogger.logSuccess(
      context,
      `Successfully logged activity for ${resource} ${resourceId}`
    );
    return NextResponse.json(
      {
        success: true,
        message: "Activity logged successfully",
        activityId: activityLog._id,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    apiLogger.logError(context, "Failed to log activity", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to log activity",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const context = apiLogger.createContext(request, "/api/activity-logs");
  apiLogger.startLogging();

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

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${
        activities.length
      } activity logs (page ${page}/${Math.ceil(totalCount / limit)})`
    );
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    apiLogger.logError(context, "Failed to fetch activity logs", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch activity logs",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
