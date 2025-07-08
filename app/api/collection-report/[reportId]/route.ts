import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getCollectionReportById } from "@/app/api/lib/helpers/accountingDetails";

/**
 * API route handler for fetching a collection report by reportId.
 * @param request - The incoming request object.
 * @returns NextResponse with the collection report data or error message.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const reportId = request.nextUrl.pathname.split("/").pop();

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
