import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../lib/middleware/db";
import { ActivityLog } from "@/app/api/lib/models/activityLog";
import { calculateChanges } from "@/app/api/lib/helpers/activityLogger";
import { getIPInfo, formatIPForDisplay } from "@/lib/utils/ipDetection";

import { generateMongoId } from "@/lib/utils/id";

/**
 * GET /api/activity-logs
 * Get activity logs with filtering, searching, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Ensure ActivityLog model is available
    if (!ActivityLog) {
      console.error("ActivityLog model is not available");
      return NextResponse.json(
        { success: false, error: "ActivityLog model not available" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Filter parameters
    const userId = searchParams.get("userId");
    const username = searchParams.get("username");
    const email = searchParams.get("email");
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");
    const resourceId = searchParams.get("resourceId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    // Sort parameters
    const sortBy = searchParams.get("sortBy") || "timestamp";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query filter
    const filter: Record<string, unknown> = {};

    if (userId) {
      filter.userId = userId;
    }

    if (username) {
      filter.username = { $regex: username, $options: "i" };
    }

    if (email) {
      // More explicit email search - ensure it's searching the right field
      filter["actor.email"] = { $regex: email, $options: "i" };
    }

    if (action) {
      filter.action = action;
    }

    if (resource) {
      filter.resource = resource;
    }

    if (resourceId) {
      filter.resourceId = resourceId;
    }

    if (startDate || endDate) {
      filter.timestamp = {} as Record<string, Date>;
      if (startDate) {
        (filter.timestamp as Record<string, Date>).$gte = new Date(startDate);
        console.warn("Activity logs start date filter:", new Date(startDate));
      }
      if (endDate) {
        (filter.timestamp as Record<string, Date>).$lte = new Date(endDate);
        console.warn("Activity logs end date filter:", new Date(endDate));
      }
    }

    // Global search across multiple fields (only if no specific filters are applied)
    if (search && !username && !email) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { "actor.email": { $regex: search, $options: "i" } },
        { resourceName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    console.warn(
      "Activity logs query filter:",
      JSON.stringify(filter, null, 2)
    );

    // Execute query with pagination
    const [logs, totalCount] = await Promise.all([
      ActivityLog.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        activities: logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activity-logs
 * Create a new activity log entry
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    const { action, resource, resourceId, userId, username, userRole } = body;

    if (!action || !resource || !resourceId || !userId || !username) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate changes if previousData and newData are provided
    let changes = body.changes || [];
    if (body.previousData && body.newData) {
      changes = calculateChanges(body.previousData, body.newData);
    }

    // Get client IP information
    const ipInfo = getIPInfo(request);
    const formattedIP = formatIPForDisplay(ipInfo);

    // Generate a proper MongoDB ObjectId-style hex string for the activity log
    const activityLogId = await generateMongoId();

    // Create new activity log
    const activityLog = new ActivityLog({
      _id: activityLogId,
      timestamp: new Date(),
      userId,
      username,
      action,
      resource,
      resourceId,
      resourceName: body.resourceName,
      details: body.details,
      description: body.description,
      actor: body.actor || {
        id: userId,
        email: username,
        role: userRole || "user",
      },
      ipAddress: formattedIP,
      userAgent: ipInfo.userAgent,
      changes: changes,
      previousData: body.previousData,
      newData: body.newData,
    });

    await activityLog.save();

    return NextResponse.json({
      success: true,
      data: { activityLog },
    });
  } catch (error) {
    console.error("Error creating activity log:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create activity log" },
      { status: 500 }
    );
  }
}
