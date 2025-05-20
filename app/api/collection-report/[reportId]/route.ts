import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { Machine } from "@/app/api/lib/models/machines";
import { getCollectionReportById } from "@/app/api/lib/helpers/accountingDetails";

// Define a type for the route context parameters
type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

/**
 * API route handler for fetching a collection report by reportId.
 * @param request - The incoming request object.
 * @param context - The route context containing params.
 * @returns NextResponse with the collection report data or error message.
 */
export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();
    const routeParams = await context.params;
    const reportId = routeParams.reportId;

    if (!reportId) {
      return NextResponse.json(
        { message: "Report ID is required" },
        { status: 400 }
      );
    }

    const reportData = await getCollectionReportById(reportId);
    if (!reportData) {
      return NextResponse.json(
        { message: "Collection Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error fetching collection report details:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
