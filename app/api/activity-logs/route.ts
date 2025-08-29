import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { ActivityLog } from "@/app/api/lib/models/activityLog";
import { apiLogger } from "@/app/api/lib/utils/logger";
import { convertResponseToTrinidadTime } from "@/app/api/lib/utils/timezone";

/**
 * Extract client IP address from request headers with comprehensive fallback
 * This function tries multiple headers to get the real client IP address
 */
function extractClientIP(request: NextRequest, fallbackIP?: string): string {
  // Try various headers that might contain the real client IP
  const possibleHeaders = [
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "x-forwarded",
    "x-cluster-client-ip",
    "forwarded-for",
    "forwarded",
    "cf-connecting-ip", // Cloudflare
    "true-client-ip", // Akamai and Cloudflare
  ];

  for (const header of possibleHeaders) {
    const value = request.headers.get(header);
    if (value) {
      // Handle comma-separated values (take the first one)
      const firstIP = value.split(",")[0].trim();
      if (firstIP && firstIP !== "unknown" && firstIP !== "::1") {
        return firstIP;
      }
    }
  }

  // Fallback to the IP provided in the request body
  if (fallbackIP && fallbackIP !== "client-side" && fallbackIP !== "unknown") {
    return fallbackIP;
  }

  // Last resort - try to get from connection
  const connection = (request as { connection?: { remoteAddress?: string } }).connection;
  if (connection?.remoteAddress) {
    return connection.remoteAddress;
  }

  return "unknown";
}

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

    // Get user information from request body or extract from JWT token
    const userId = body.userId || "unknown";
    const username = body.username || "unknown";

    // Get client IP from headers with comprehensive fallback
    const clientIP = extractClientIP(request, ipAddress);

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
    const ipAddress = searchParams.get("ipAddress");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query
    const query: Record<string, unknown> = {};

    if (userId) {
      query.userId = userId;
    }

    if (resource) {
      query.resource = resource;
    }

    if (action) {
      query.action = action;
    }

    if (ipAddress) {
      query.ipAddress = ipAddress;
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
        activities: convertResponseToTrinidadTime(activities),
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
