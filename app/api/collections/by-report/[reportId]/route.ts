import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Collections } from "@/app/api/lib/models/collections";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import type { CollectionDocument } from "@/lib/types/collections";

/**
 * GET /api/collections/by-report/[reportId]
 * Fetches all collections for a specific collection report
 * This endpoint handles the locationReportId mismatch by:
 * 1. First trying to find collections by locationReportId
 * 2. If none found, finding collections by location name from the report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  await connectDB();
  try {
    const { reportId } = await params;

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Step 1: Find the collection report to get location information
    const collectionReport = await CollectionReport.findOne({
      locationReportId: reportId,
    });

    if (!collectionReport) {
      return NextResponse.json(
        { error: "Collection report not found" },
        { status: 404 }
      );
    }

    // Step 2: Try to find collections by locationReportId first
    let collections = (await Collections.find({
      locationReportId: reportId,
    }).lean()) as CollectionDocument[];

    // Step 3: If no collections found by locationReportId, try by location name
    if (collections.length === 0 && collectionReport.locationName) {
      collections = (await Collections.find({
        location: collectionReport.locationName,
      }).lean()) as CollectionDocument[];
    }

    return NextResponse.json(collections);
  } catch (error) {
    console.error(" Error fetching collections by report ID:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
