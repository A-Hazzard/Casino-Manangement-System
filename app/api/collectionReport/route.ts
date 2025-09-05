import { NextRequest, NextResponse } from "next/server";
import {
  getMonthlyCollectionReportSummary,
  getMonthlyCollectionReportByLocation,
} from "@/lib/helpers/collectionReport";
import { getAllCollectionReportsWithMachineCounts } from "@/app/api/lib/helpers/collectionReportBackend";
import { connectDB } from "@/app/api/lib/middleware/db";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import type { CreateCollectionReportPayload } from "@/lib/types/api";
import type { TimePeriod } from "@/app/api/lib/types";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { Machine } from "@/app/api/lib/models/machines";
import { calculateCollectionReportTotals } from "@/app/api/lib/helpers/collectionReportCalculations";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);

  // If ?locationsOnly is present, return locations with machines
  if (searchParams.get("locationsWithMachines")) {
    // Fetch all locations
    const locations = await GamingLocations.find(
      {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date("2020-01-01") } },
        ],
      },
      "_id name"
    ).lean();
    // For each location, fetch its machines
    const locationsWithMachines = await Promise.all(
      locations.map(async (loc) => {
        const machines = await Machine.find(
          {
            gamingLocation: loc._id,
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date("1970-01-01") } },
            ],
          },
          "_id serialNumber custom.name collectionMeters collectionTime"
        ).lean();
        return {
          _id: loc._id,
          name: loc.name,
          machines: machines.map((m) => ({
            _id: m._id,
            serialNumber: m.serialNumber,
            name: m.custom?.name || m.serialNumber || "Unnamed Machine",
            collectionMeters: m.collectionMeters || {
              metersIn: 0,
              metersOut: 0,
            },
            collectionTime: m.collectionTime,
          })),
        };
      })
    );
    return NextResponse.json({ locations: locationsWithMachines });
  }

  const timePeriod =
    (searchParams.get("timePeriod") as TimePeriod) || undefined;
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const locationName = searchParams.get("locationName") || undefined;
  const licencee = searchParams.get("licencee") || undefined;

  // If startDate and endDate are present AND no timePeriod is specified, treat as monthly aggregation
  if (startDateStr && endDateStr && !timePeriod) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Use the updated monthly aggregation functions that now support licensee filtering
    const summary = await getMonthlyCollectionReportSummary(
      startDate,
      endDate,
      locationName,
      licencee
    );
    const details = await getMonthlyCollectionReportByLocation(
      startDate,
      endDate,
      locationName,
      licencee
    );
    return NextResponse.json({ summary, details });
  }

  // Handle individual collection reports with time period or date filtering
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (timePeriod && timePeriod !== "Custom") {
    // Convert time period to date range
    const { startDate: s, endDate: e } = getDatesForTimePeriod(timePeriod);
    startDate = s;
    endDate = e;
  } else if (startDateStr && endDateStr) {
    // Use custom date range
    startDate = new Date(startDateStr);
    endDate = new Date(endDateStr);
  }

  const reports = await getAllCollectionReportsWithMachineCounts(licencee, startDate, endDate);
  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const body = (await req.json()) as CreateCollectionReportPayload;
    // Basic validation (required fields)
    const requiredFields = [
      "variance",
      "previousBalance",
      "currentBalance",
      "amountToCollect",
      "amountCollected",
      "amountUncollected",
      "partnerProfit",
      "taxes",
      "advance",
      "collectorName",
      "locationName",
      "locationReportId",
      "location",
      "timestamp",
    ];
    for (const field of requiredFields) {
      if (
        body[field as keyof CreateCollectionReportPayload] === undefined ||
        body[field as keyof CreateCollectionReportPayload] === null
      ) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    // Sanitize string fields (basic trim)
    const stringFields = [
      "collectorName",
      "locationName",
      "locationReportId",
      "location",
      "varianceReason",
      "reasonForShortagePayment",
      "balanceCorrectionReas",
    ];
    const bodyRecord: Record<string, unknown> = body as Record<string, unknown>;
    stringFields.forEach((field) => {
      if (bodyRecord[field] && typeof bodyRecord[field] === "string") {
        bodyRecord[field] = (bodyRecord[field] as string).trim();
      }
    });
    // Calculate totals on backend
    const calculated = await calculateCollectionReportTotals(body);
    // Convert timestamp fields
    const doc = {
      ...body,
      ...calculated,
      _id: body.locationReportId,
      timestamp: new Date(body.timestamp),
      previousCollectionTime: body.previousCollectionTime
        ? new Date(body.previousCollectionTime)
        : undefined,
    };
    const created = await CollectionReport.create(doc);

    // After creating the report, update collectionMeters for each machine
    if (body.machines && Array.isArray(body.machines)) {
      for (const m of body.machines) {
        if (m.machineId) {
          await Machine.findByIdAndUpdate(
            m.machineId,
            {
              $set: {
                "collectionMeters.metersIn": Number(m.metersIn) || 0,
                "collectionMeters.metersOut": Number(m.metersOut) || 0,
                updatedAt: new Date(),
              },
            },
            { new: true }
          ).catch((err) => {
            console.error(
              `Failed to update collectionMeters for machine ${m.machineId}:`,
              err
            );
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: created._id });
  } catch (err) {
    console.error("Error creating collection report:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create collection report." },
      { status: 500 }
    );
  }
}
