import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Collections } from "@/app/api/lib/models/collections";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const { reportId } = await req.json();

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Find the collection report to get the location
    const report = await CollectionReport.findById(reportId).lean();
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Update all collections with the correct locationReportId
    const updateResult = await Collections.updateMany(
      {
        location: report.location,
        locationReportId: { $ne: reportId },
      },
      {
        $set: { locationReportId: reportId },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Updated ${updateResult.modifiedCount} collections with correct locationReportId`,
      reportId,
      location: report.location,
      updatedCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error("Error fixing location report IDs:", error);
    return NextResponse.json(
      {
        error: "Failed to fix location report IDs",
        details: (error as Error)?.message,
      },
      { status: 500 }
    );
  }
}
