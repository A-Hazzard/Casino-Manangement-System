import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import {
  LocationResponse,
  MetricsMatchStage,
  MeterMatchStage,
  Metric,
} from "@/lib/types/location";

// Main search endpoint for dashboard location search
export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const licencee = searchParams.get("licencee") ?? "";
    const timePeriod = searchParams.get("timePeriod") ?? "today";

    // Fix: Allow capital or lowercase for time period case
    const timePeriodNormalized = timePeriod.toLowerCase();

    const metricsMatch: MetricsMatchStage = {};
    if (licencee) metricsMatch["rel.licencee"] = licencee;
    if (timePeriodNormalized) metricsMatch["timePeriod"] = timePeriodNormalized;

    const search = searchParams.get("search")?.trim() || "";

    // Build location matching
    const locationMatch: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    };

    if (search) {
      locationMatch.name = { $regex: search, $options: "i" };
    }
    if (licencee) locationMatch["rel.licencee"] = licencee;

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { success: false, message: "DB connection failed" },
        { status: 500 }
      );
    }

    const { searchParams: searchParamsFromRequest } = new URL(request.url);
    const startDate = new Date(
      searchParamsFromRequest.get("startDate") ??
        Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    const endDate = new Date(
      searchParamsFromRequest.get("endDate") ?? Date.now()
    );

    // Build metrics aggregation
    const matchStage: MeterMatchStage = {
      readAt: { $gte: startDate, $lte: endDate },
    };
    if (licencee) {
      matchStage["rel.licencee"] = licencee;
    }

    const metrics = await db
      .collection("meters")
      .aggregate<Metric>([
        // Stage 1: Filter meter records by date range and licencee
        { $match: matchStage },
        // Stage 2: Group by location to calculate financial metrics
        {
          $group: {
            _id: "$location",
            moneyIn: { $sum: "$movement.drop" },
            moneyOut: { $sum: "$movement.totalCancelledCredits" },
          },
        },
        // Stage 3: Calculate gross revenue (money in minus money out)
        { $addFields: { gross: { $subtract: ["$moneyIn", "$moneyOut"] } } },
      ])
      .toArray();

    const metricsMap = new Map<string, Metric>(metrics.map((m: Metric) => [m._id, m]));

    const locations = await db
      .collection("gaminglocations")
      .aggregate<LocationResponse>([
        // Stage 1: Filter locations by deletion status, search term, and licencee
        { $match: locationMatch },
        // Stage 2: Lookup machine statistics for each location
        {
          $lookup: {
            from: "machines",
            let: { id: "$_id" },
            pipeline: [
              // Stage 2a: Match machines for this location (excluding deleted ones)
              {
                $match: {
                  $expr: { $eq: ["$gamingLocation", "$$id"] },
                  $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
                },
              },
              // Stage 2b: Group machines to calculate counts and online status
              {
                $group: {
                  _id: null,
                  totalMachines: { $sum: 1 },
                  onlineMachines: {
                    $sum: {
                      $cond: [
                        {
                          $gt: [
                            "$lastActivity",
                            new Date(Date.now() - 3 * 60 * 1000),
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            as: "machineStats",
          },
        },
        // Stage 3: Add computed fields for machine statistics and location flags
        {
          $addFields: {
            totalMachines: {
              $ifNull: [
                { $arrayElemAt: ["$machineStats.totalMachines", 0] },
                0,
              ],
            },
            onlineMachines: {
              $ifNull: [
                { $arrayElemAt: ["$machineStats.onlineMachines", 0] },
                0,
              ],
            },
            isLocalServer: { $ifNull: ["$isLocalServer", false] },
            hasSmib: { $ifNull: ["$hasSmib", false] },
          },
        },
        // Stage 4: Project final fields for location response
        {
          $project: {
            _id: 1,
            name: 1,
            address: 1,
            country: 1,
            rel: 1,
            profitShare: 1,
            geoCoords: 1,
            totalMachines: 1,
            onlineMachines: 1,
            isLocalServer: 1,
            hasSmib: 1,
          },
        },
      ])
      .toArray();

    const response = locations.map((loc: LocationResponse) => {
      const metric: Metric | undefined = metricsMap.get(loc._id);
      return {
        _id: loc._id,
        locationName: loc.name,
        country: loc.country,
        address: loc.address,
        rel: loc.rel,
        profitShare: loc.profitShare,
        geoCoords: loc.geoCoords,
        totalMachines: loc.totalMachines,
        onlineMachines: loc.onlineMachines,
        moneyIn: metric?.moneyIn ?? 0,
        moneyOut: metric?.moneyOut ?? 0,
        gross: metric?.gross ?? 0,
        isLocalServer: loc.isLocalServer,
        hasSmib: loc.hasSmib,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("🔥 Search Metrics API Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
