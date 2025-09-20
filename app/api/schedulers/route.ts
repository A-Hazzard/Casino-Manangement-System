import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import Scheduler from "@/app/api/lib/models/scheduler";
import type { MongoDBQueryValue } from "@/lib/types/mongo";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const licencee = searchParams.get("licencee");
    const location = searchParams.get("location");
    const collector = searchParams.get("collector");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query filters
    const query: Record<string, MongoDBQueryValue> = {};

    if (licencee && licencee.toLowerCase() !== "all") {
      query.licencee = licencee;
    }

    if (location && location.toLowerCase() !== "all") {
      query.location = location;
    }

    if (collector && collector.toLowerCase() !== "all") {
      query.collector = collector;
    }

    if (status && status.toLowerCase() !== "all") {
      query.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      query.startTime = {} as Record<string, Date>;
      if (startDate) {
        (query.startTime as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.startTime as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    // Fetch schedulers using the Mongoose model
    const schedulers = await Scheduler.find(query)
      .sort({ startTime: -1 })
      .lean();

    return NextResponse.json(schedulers);
  } catch (error: unknown) {
    console.error("Error fetching schedulers:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch schedulers", details: errorMessage },
      { status: 500 }
    );
  }
}