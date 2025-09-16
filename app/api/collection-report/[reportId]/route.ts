import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getCollectionReportById } from "@/app/api/lib/helpers/accountingDetails";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { logActivity } from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "@/lib/utils/user";
import { getClientIP } from "@/lib/utils/ipAddress";
import type { CreateCollectionReportPayload } from "@/lib/types/api";

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

/**
 * API route handler for updating a collection report by reportId.
 * @param request - The incoming request object.
 * @returns NextResponse with the updated collection report data or error message.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const reportId = request.nextUrl.pathname.split("/").pop();

    if (!reportId) {
      return NextResponse.json(
        { message: "Report ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json() as Partial<CreateCollectionReportPayload>;

    // Find the existing report
    const existingReport = await CollectionReport.findById(reportId);
    if (!existingReport) {
      return NextResponse.json(
        { message: "Collection Report not found" },
        { status: 404 }
      );
    }

    // Update the report
    const updatedReport = await CollectionReport.findByIdAndUpdate(
      reportId,
      { 
        ...body,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedReport) {
      return NextResponse.json(
        { message: "Failed to update collection report" },
        { status: 500 }
      );
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const updateChanges = Object.keys(body).map(key => ({
          field: key,
          oldValue: existingReport[key as keyof typeof existingReport],
          newValue: body[key as keyof typeof body]
        }));

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "UPDATE",
          "collection",
          { id: reportId, name: `${existingReport.locationName} - ${existingReport.collectorName}` },
          updateChanges,
          `Updated collection report for ${existingReport.locationName}`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json({ success: true, data: updatedReport });
  } catch (error) {
    console.error("Error updating collection report:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
