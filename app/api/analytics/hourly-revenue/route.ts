import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const timePeriod = searchParams.get("timePeriod") || "24h";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Calculate date range based on time period
    let start, end;
    const now = new Date();

    if (timePeriod === "Custom" && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (timePeriod) {
        case "24h":
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          end = now;
          break;
        case "7d":
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case "30d":
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        default:
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          end = now;
      }
    }

    // Aggregate hourly data for the location
    const pipeline = [
      {
        $match: {
          location: locationId,
          readAt: { $gte: start, $lte: end },
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date("2020-01-01") } },
          ],
        },
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$createdAt" },
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          revenue: { $sum: "$gross" },
          drop: { $sum: "$moneyIn" },
          cancelledCredits: { $sum: "$moneyOut" },
        },
      },
      {
        $group: {
          _id: "$_id.hour",
          avgRevenue: { $avg: "$revenue" },
          totalRevenue: { $sum: "$revenue" },
          avgDrop: { $avg: "$drop" },
          totalDrop: { $sum: "$drop" },
          avgCancelledCredits: { $avg: "$cancelledCredits" },
          totalCancelledCredits: { $sum: "$cancelledCredits" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];

    const hourlyData = await db
      .collection("collectionReports")
      .aggregate(pipeline)
      .toArray();

    // Create a 24-hour array with zeroes for missing hours
    const hourlyRevenue = Array.from({ length: 24 }, (_, hour) => {
      const hourData = hourlyData.find((d) => d._id === hour);
      return {
        hour,
        revenue: hourData ? hourData.avgRevenue : 0,
        drop: hourData ? hourData.avgDrop : 0,
        cancelledCredits: hourData ? hourData.avgCancelledCredits : 0,
      };
    });

    return NextResponse.json(hourlyRevenue);
  } catch (error) {
    console.error("Error fetching hourly revenue data:", error);
    return NextResponse.json(
      { error: "Failed to fetch hourly revenue data" },
      { status: 500 }
    );
  }
}
