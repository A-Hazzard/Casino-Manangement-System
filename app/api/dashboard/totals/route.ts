import { connectDB } from "@/app/api/lib/middleware/db";
import { NextRequest, NextResponse } from "next/server";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { TimePeriod } from "@/app/api/lib/types";
import { Document } from "mongodb";

/**
 * Gets overall dashboard totals (Money In, Money Out, Gross) across ALL locations
 * using the same aggregation logic as the working MongoDB shell queries.
 * Always returns a result with 0 values if no data exists.
 */
export async function GET(req: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      console.error("Database connection not established");
      return NextResponse.json(
        { error: "Database connection not established" },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const timePeriod = searchParams.get("timePeriod");
    const licencee = searchParams.get("licencee");

    // Only proceed if timePeriod is provided
    if (!timePeriod) {
      return NextResponse.json(
        { error: "timePeriod parameter is required" },
        { status: 400 }
      );
    }

    let startDate: Date | undefined, endDate: Date | undefined;

    if (timePeriod === "Custom") {
      const customStart = searchParams.get("startDate");
      const customEnd = searchParams.get("endDate");
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: "Missing startDate or endDate" },
          { status: 400 }
        );
      }
      // For custom date ranges, the frontend sends dates that already represent Trinidad time
      // We need to convert them to UTC for database queries by adding 4 hours
      const start = new Date(customStart);
      const end = new Date(customEnd);
      
      // Convert Trinidad time to UTC by adding 4 hours
      startDate = new Date(start.getTime() + (4 * 60 * 60 * 1000));
      endDate = new Date(end.getTime() + (4 * 60 * 60 * 1000));
    } else {
      const { startDate: s, endDate: e } = getDatesForTimePeriod(timePeriod as TimePeriod);
      startDate = s;
      endDate = e;
    }

    // Build the aggregation pipeline using the same logic as your working MongoDB shell queries
    const pipeline: Document[] = [
      // Match meters within the date range
      {
        $match: {
          ...(startDate && endDate
            ? {
                readAt: { $gte: startDate, $lte: endDate }
              }
            : {}),
        },
      },
      // Group and sum all movement values
      {
        $group: {
          _id: null,
          totalDrop: { $sum: "$movement.drop" },
          totalCancelled: { $sum: "$movement.totalCancelledCredits" }
        }
      },
      // Project with proper field names and gross calculation
      {
        $project: {
          _id: 0,
          moneyIn: { $ifNull: ["$totalDrop", 0] },
          moneyOut: { $ifNull: ["$totalCancelled", 0] },
          gross: { 
            $subtract: [
              { $ifNull: ["$totalDrop", 0] }, 
              { $ifNull: ["$totalCancelled", 0] }
            ] 
          }
        }
      }
    ];

    // If licencee filter is provided, we need to filter by locations first
    if (licencee && licencee !== "all") {
      // First get all location IDs for this licencee
      const locations = await db
        .collection("gaminglocations")
        .find(
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date("2020-01-01") } },
            ],
            "rel.licencee": licencee,
          },
          { projection: { _id: 1 } }
        )
        .toArray();

      const locationIds = locations.map((l) => l._id);

      if (locationIds.length === 0) {
        // No locations for this licencee, return 0 values
        return NextResponse.json({
          moneyIn: 0,
          moneyOut: 0,
          gross: 0
        });
      }

      // Get all machines for these locations
      const machines = await db
        .collection("machines")
        .find(
          {
            gamingLocation: { $in: locationIds },
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date("2020-01-01") } },
            ],
          },
          { projection: { _id: 1 } }
        )
        .toArray();

      const machineIds = machines.map((m) => m._id);

      if (machineIds.length === 0) {
        // No machines for this licencee, return 0 values
        return NextResponse.json({
          moneyIn: 0,
          moneyOut: 0,
          gross: 0
        });
      }

      // Update the pipeline to filter by machine IDs
      pipeline[0] = {
        $match: {
          machine: { $in: machineIds },
          ...(startDate && endDate
            ? {
                readAt: { $gte: startDate, $lte: endDate }
              }
            : {}),
        },
      };
    }

    // Execute the aggregation
    const result = await db.collection("meters").aggregate(pipeline).toArray();

    // Always return a result, even if no data exists
    const totals = result[0] || {
      moneyIn: 0,
      moneyOut: 0,
      gross: 0
    };

    return NextResponse.json(totals);
  } catch (error) {
    console.error("Error in dashboard totals API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
