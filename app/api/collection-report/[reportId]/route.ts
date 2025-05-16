import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { Machine } from "@/app/api/lib/models/machines";

// Define a type for the route context parameters
type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

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

    // Fetch the main CollectionReport document
    const reportDetails = await CollectionReport.findOne({
      locationReportId: reportId,
    }).lean();

    if (!reportDetails) {
      return NextResponse.json(
        { message: "Collection Report not found" },
        { status: 404 }
      );
    }

    // Fetch machines that have a collectionMetersHistory entry for this reportId
    const machinesInReport = await Machine.find({
      "collectionMetersHistory.locationReportId": reportId,
    }).lean();

    const machineCollectionMetrics = machinesInReport
      .map((machine) => {
        const historyEntry = machine.collectionMetersHistory?.find(
          (entry: { locationReportId?: string /* other fields if needed */ }) =>
            entry.locationReportId === reportId
        );

        if (!historyEntry) {
          // This case should ideally not be reached if the initial query is correct
          // and data integrity is maintained. Log or handle as an anomaly.
          console.warn(
            `No collectionMetersHistory entry found for reportId ${reportId} in machine ${machine._id}`
          );
          return null;
        }

        const metersInDiff =
          (historyEntry.metersIn || 0) - (historyEntry.prevMetersIn || 0);
        const metersOutDiff =
          (historyEntry.metersOut || 0) - (historyEntry.prevMetersOut || 0);
        const meterGross = metersInDiff - metersOutDiff;

        // Placeholder for per-machine cancelled credits for this specific collection event
        const cancelledCreditsForEvent = 0; // TODO: Determine the source for this

        return {
          machineDocumentId: machine._id, // Raw machine document ID
          machineIdToDisplay: machine.serialNumber || machine._id, // What to show in the table (e.g., Serial Number)
          machineName: machine.Custom?.name || "N/A",
          metersInDiff,
          metersOutDiff,
          meterGross,
          dropCancelledDisplay: `${metersInDiff} / ${cancelledCreditsForEvent}`,
          // TODO: Add SAS Gross, Variation, SAS Times for this specific machine & collection event
          // These likely need to come from a different source or a more complex aggregation if not directly available
          sasGrossForEvent: "-", // Placeholder
          variationForEvent: "-", // Placeholder
          sasTimesForEvent: "N/A", // Placeholder
        };
      })
      .filter(Boolean); // filter out any nulls if a machine had no matching history (should be rare)

    const responseData = {
      reportDetails, // This is ICollectionReport
      machineCollectionMetrics, // This is an array of the object structured above
      // TODO: Define and add aggregated SAS comparison data if needed for the SAS Metrics Compare tab
      sasMetricsCompare: {
        dropped:
          reportDetails.totalSasGross !== undefined
            ? reportDetails.totalDrop
            : 0, // Example: using totalDrop if totalSasGross means SAS is active
        cancelled: 0, // Placeholder for total SAS cancelled for this report
        gross: reportDetails.totalSasGross || 0,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching collection report details:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
