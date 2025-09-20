import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getDatesForTimePeriod } from "@/lib/utils/dates";
import { TimePeriod } from "@/shared/types";
import type { PipelineStage } from "mongoose";

type ManufacturerDataItem = {
  _id: string;
  totalMachines: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const timePeriod = (searchParams.get("timePeriod") as TimePeriod) || "Today";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const licencee = searchParams.get("licencee");

    if (!locationId || locationId === "all") {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) {
      console.error("Database connection not established");
      return NextResponse.json(
        { error: "Database connection not established" },
        { status: 500 }
      );
    }

    // Get date range
    let startDateFilter: Date | undefined, endDateFilter: Date | undefined;

    if (startDate && endDate) {
      startDateFilter = new Date(startDate);
      endDateFilter = new Date(endDate);
    } else {
      const dateRange = getDatesForTimePeriod(timePeriod);
      startDateFilter = dateRange.startDate;
      endDateFilter = dateRange.endDate;
    }

    if (!startDateFilter || !endDateFilter) {
      const now = new Date();
      endDateFilter = now;
      startDateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    }

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          readAt: { $gte: startDateFilter, $lte: endDateFilter },
          location: locationId,
        },
      },
      {
        $lookup: {
          from: "gaminglocations",
          localField: "location",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      {
        $unwind: { path: "$locationDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "machines",
          localField: "machine",
          foreignField: "_id",
          as: "machineDetails",
        },
      },
      {
        $unwind: { path: "$machineDetails", preserveNullAndEmptyArrays: true },
      },
    ];

    // Add licensee filter if specified
    if (licencee && licencee !== "all") {
      (pipeline as PipelineStage[]).push({
        $match: {
          "locationDetails.rel.licencee": licencee,
        },
      });
    }

    // Continue with aggregation
    (pipeline as PipelineStage[]).push(
      {
        $group: {
          _id: {
            $cond: [
              { $and: [
                { $ne: ["$machineDetails.manufacturer", null] },
                { $ne: ["$machineDetails.manufacturer", ""] }
              ]},
              "$machineDetails.manufacturer",
              "$machineDetails.manuf"
            ]
          },
          totalMachines: { $addToSet: "$machine" },
          totalHandle: { $sum: { $ifNull: ["$movement.coinIn", 0] } },
          totalWin: { 
            $sum: { 
              $subtract: [
                { $ifNull: ["$movement.coinIn", 0] },
                { $ifNull: ["$movement.coinOut", 0] }
              ]
            }
          },
          totalDrop: { $sum: { $ifNull: ["$movement.drop", 0] } },
          totalCancelledCredits: { $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] } },
          totalGross: { $sum: { $ifNull: ["$movement.gross", 0] } }
        }
      },
      {
        $addFields: {
          totalMachines: { $size: "$totalMachines" }
        }
      },
      {
        $sort: { totalHandle: -1 }
      }
    );

    const manufacturerData = await db.collection("meters").aggregate(pipeline).toArray() as ManufacturerDataItem[];

    // Calculate totals for percentage calculations
    const totals = manufacturerData.reduce((acc: {
      totalMachines: number;
      totalHandle: number;
      totalWin: number;
      totalDrop: number;
      totalCancelledCredits: number;
      totalGross: number;
    }, item: ManufacturerDataItem) => {
      acc.totalMachines += item.totalMachines;
      acc.totalHandle += item.totalHandle;
      acc.totalWin += item.totalWin;
      acc.totalDrop += item.totalDrop;
      acc.totalCancelledCredits += item.totalCancelledCredits;
      acc.totalGross += item.totalGross;
      return acc;
    }, {
      totalMachines: 0,
      totalHandle: 0,
      totalWin: 0,
      totalDrop: 0,
      totalCancelledCredits: 0,
      totalGross: 0
    });

    // Calculate percentages
    const result = manufacturerData.map((item: ManufacturerDataItem) => ({
      manufacturer: item._id || "Unknown",
      floorPositions: totals.totalMachines > 0 ? Math.round((item.totalMachines / totals.totalMachines) * 100) : 0,
      totalHandle: totals.totalHandle > 0 ? Math.round((item.totalHandle / totals.totalHandle) * 100) : 0,
      totalWin: totals.totalWin > 0 ? Math.round((item.totalWin / totals.totalWin) * 100) : 0,
      totalDrop: totals.totalDrop > 0 ? Math.round((item.totalDrop / totals.totalDrop) * 100) : 0,
      totalCancelledCredits: totals.totalCancelledCredits > 0 ? Math.round((item.totalCancelledCredits / totals.totalCancelledCredits) * 100) : 0,
      totalGross: totals.totalGross > 0 ? Math.round((item.totalGross / totals.totalGross) * 100) : 0
    }));

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error fetching manufacturer performance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch manufacturer performance data" },
      { status: 500 }
    );
  }
}
