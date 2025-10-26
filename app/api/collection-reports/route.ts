import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../lib/middleware/db";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationReportId = searchParams.get("locationReportId");
    const isEditing = searchParams.get("isEditing");
    const limit = searchParams.get("limit");
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    await connectDB();

    const query: Record<string, unknown> = {};
    if (locationReportId) {
      query.locationReportId = locationReportId;
    }
    if (isEditing === "true") {
      query.isEditing = true;
    }

    let queryBuilder = CollectionReport.find(query);

    // Apply sorting
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    queryBuilder = queryBuilder.sort(sortOptions);

    // Apply limit if specified
    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit, 10));
    }

    const collectionReports = await queryBuilder.exec();

    return NextResponse.json(collectionReports);
  } catch (error) {
    console.error("Error fetching collection reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
