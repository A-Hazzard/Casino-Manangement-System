import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Machine } from "@/app/api/lib/models/machines";
import {
  getMonthlyCollectionReportSummary,
  getMonthlyCollectionReportByLocation,
} from "@/lib/helpers/collectionReport";
import { getAllCollectionReportsWithMachineCounts } from "@/app/api/lib/helpers/collectionReportBackend";
import { connectDB } from "@/app/api/lib/middleware/db";
import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { logActivity } from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "../lib/helpers/users";
import { getClientIP } from "@/lib/utils/ipAddress";
import type { CreateCollectionReportPayload } from "@/lib/types/api";
import type { TimePeriod } from "@/app/api/lib/types";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { calculateCollectionReportTotals } from "@/app/api/lib/helpers/collectionReportCalculations";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    // If ?locationsOnly is present, return locations with machines
    if (searchParams.get("locationsWithMachines")) {
      console.warn("🔄 Fetching locations with machines...");
      const startTime = Date.now();
      
      // Use aggregation pipeline for better performance
      const locationsWithMachines = await GamingLocations.aggregate([
        {
          $match: {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date("2020-01-01") } },
            ],
          },
        },
        {
          $lookup: {
            from: "machines",
            localField: "_id",
            foreignField: "gamingLocation",
            as: "machines",
            pipeline: [
              {
                $match: {
                  $or: [
                    { deletedAt: null },
                    { deletedAt: { $lt: new Date("1970-01-01") } },
                  ],
                },
              },
              {
                $project: {
                  _id: 1,
                  serialNumber: 1,
                  "custom.name": 1,
                  collectionMeters: 1,
                  collectionTime: 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            previousCollectionTime: 1,
            profitShare: 1,
            machines: {
              $map: {
                input: "$machines",
                as: "machine",
                in: {
                  _id: "$$machine._id",
                  serialNumber: "$$machine.serialNumber",
                  name: {
                    $ifNull: [
                      "$$machine.custom.name",
                      {
                        $ifNull: ["$$machine.serialNumber", "Unnamed Machine"],
                      },
                    ],
                  },
                  collectionMeters: {
                    $ifNull: [
                      "$$machine.collectionMeters",
                      { metersIn: 0, metersOut: 0 },
                    ],
                  },
                  collectionTime: "$$machine.collectionTime",
                },
              },
            },
          },
        },
      ]);
      
      console.warn(`✅ Locations with machines fetched in ${Date.now() - startTime}ms`);
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

    console.warn("🔄 Fetching collection reports...");
    const startTime = Date.now();
    
    const reports = await getAllCollectionReportsWithMachineCounts(
      licencee,
      startDate,
      endDate
    );
    
    console.warn(`✅ Collection reports fetched in ${Date.now() - startTime}ms (${reports.length} reports)`);
    return NextResponse.json(reports);
  } catch (error) {
    console.error("❌ Error in collectionReport GET endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch collection reports",
        details: "Database connection or query failed",
      },
      { status: 500 }
    );
  }
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
    // and update gaming location's previousCollectionTime
    if (body.machines && Array.isArray(body.machines)) {
      for (const m of body.machines) {
        if (m.machineId) {
          // Get current machine data to access previous meters
          const currentMachine = await Machine.findById(m.machineId).lean();
          if (currentMachine) {
            const currentMachineData = currentMachine as Record<
              string,
              unknown
            >;
            const currentCollectionMeters =
              currentMachineData.collectionMeters as
                | { metersIn: number; metersOut: number }
                | undefined;

            // Prepare history entry
            const historyEntry = {
              _id: new mongoose.Types.ObjectId(), // Use mongoose ObjectId for proper type
              metersIn: Number(m.metersIn) || 0,
              metersOut: Number(m.metersOut) || 0,
              prevMetersIn: currentCollectionMeters?.metersIn || 0,
              prevMetersOut: currentCollectionMeters?.metersOut || 0,
              timestamp: new Date(),
              locationReportId: body.locationReportId,
            };

            // Update machine collection meters and add to history
            await Machine.findByIdAndUpdate(
              m.machineId,
              {
                $set: {
                  "collectionMeters.metersIn": Number(m.metersIn) || 0,
                  "collectionMeters.metersOut": Number(m.metersOut) || 0,
                  updatedAt: new Date(),
                },
                $push: {
                  collectionMetersHistory: historyEntry,
                },
              },
              { new: true }
            ).catch((err) => {
              console.error(
                `Failed to update collectionMeters and history for machine ${m.machineId}:`,
                err
              );
            });
          }

          // Update gaming location's previousCollectionTime
          if (currentMachine) {
            const machineData = currentMachine as Record<string, unknown>;
            const gamingLocationId = machineData.gamingLocation as string;

            if (gamingLocationId) {
              const { GamingLocations } = await import(
                "@/app/api/lib/models/gaminglocations"
              );
              await GamingLocations.findByIdAndUpdate(
                gamingLocationId,
                {
                  $set: {
                    previousCollectionTime: new Date(
                      m.collectionTime || body.timestamp
                    ), // Use machine collection time or fallback to report timestamp
                    updatedAt: new Date(),
                  },
                },
                { new: true }
              ).catch((err) => {
                console.error(
                  `Failed to update previousCollectionTime for gaming location ${gamingLocationId}:`,
                  err
                );
              });
            }
          }
        }
      }
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          {
            field: "locationName",
            oldValue: null,
            newValue: body.locationName,
          },
          {
            field: "collectorName",
            oldValue: null,
            newValue: body.collectorName,
          },
          {
            field: "amountCollected",
            oldValue: null,
            newValue: body.amountCollected,
          },
          {
            field: "amountToCollect",
            oldValue: null,
            newValue: body.amountToCollect,
          },
          { field: "variance", oldValue: null, newValue: body.variance },
          {
            field: "partnerProfit",
            oldValue: null,
            newValue: body.partnerProfit,
          },
          { field: "taxes", oldValue: null, newValue: body.taxes },
          {
            field: "machines",
            oldValue: null,
            newValue: body.machines?.length || 0,
          },
        ];

        await logActivity({
          action: "CREATE",
          details: `Created collection report for ${body.locationName} by ${
            body.collectorName
          } (${body.machines?.length || 0} machines, $${
            body.amountCollected
          } collected)`,
          ipAddress: getClientIP(req) || undefined,
          userAgent: req.headers.get("user-agent") || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || "user",
            resource: "collection",
            resourceId: created._id.toString(),
            resourceName: `${body.locationName} - ${body.collectorName}`,
            changes: createChanges,
          },
        });
      } catch (logError) {
        console.error("Failed to log activity:", logError);
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
