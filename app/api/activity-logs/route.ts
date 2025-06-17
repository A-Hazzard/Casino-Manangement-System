import { NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getActivityLogs } from "@/app/api/lib/helpers/activityLogger";
import type { ActivityLogQueryParams } from "@/app/api/lib/types/activityLog";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const params: ActivityLogQueryParams = {
      entityType: searchParams.get("entityType") || undefined,
      actionType: searchParams.get("actionType") || undefined,
      actorId: searchParams.get("actorId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit") || "20",
      skip: searchParams.get("skip") || "0",
    };

    const result = await getActivityLogs(params);

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        total: result.total,
        count: result.data.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch activity logs",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
