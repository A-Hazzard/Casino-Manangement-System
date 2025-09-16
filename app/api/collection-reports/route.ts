import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../lib/middleware/db";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationReportId = searchParams.get("locationReportId");

    await connectDB();

    let query = {};
    if (locationReportId) {
      query = { locationReportId };
    }

    const collectionReports = await CollectionReport.find(query);

    return NextResponse.json(collectionReports);
  } catch (error) {
    console.error("Error fetching collection reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
