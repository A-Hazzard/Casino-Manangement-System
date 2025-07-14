import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { TimePeriod } from "@/app/api/lib/types";

function getPreviousPeriod(startDate: Date, endDate: Date, days: number) {
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - (days * 24 * 60 * 60 * 1000) + 1);
  return { prevStart, prevEnd };
}

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

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const timePeriod = (searchParams.get("timePeriod") as TimePeriod) || "Today";
    const licencee = searchParams.get("licencee");

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    // Get date range
    const { startDate, endDate } = getDatesForTimePeriod(timePeriod);

    // 1. Fetch current period revenue (actual total for this period)
    const currentPipeline = [
      {
        $match: {
          location: locationId,
          readAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $subtract: [
                { $ifNull: ["$movement.drop", 0] },
                { $ifNull: ["$movement.totalCancelledCredits", 0] }
              ]
            }
          }
        }
      }
    ];
    const currentResult = await db.collection("meters").aggregate(currentPipeline).toArray();
    const currentPeriodRevenue = currentResult[0]?.totalRevenue || 0;

    // 2. Fetch previous period average daily revenue (previous 7 days, not including current)
    const days = 7;
    const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate, days);
    const prevPipeline = [
      {
        $match: {
          location: locationId,
          readAt: { $gte: prevStart, $lte: prevEnd }
        }
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$readAt" } }
          },
          dailyRevenue: {
            $sum: {
              $subtract: [
                { $ifNull: ["$movement.drop", 0] },
                { $ifNull: ["$movement.totalCancelledCredits", 0] }
              ]
            }
          }
        }
      }
    ];
    const prevResult = await db.collection("meters").aggregate(prevPipeline).toArray();
    const prevDays = prevResult.length;
    const prevTotal = prevResult.reduce((sum, d) => sum + (d.dailyRevenue || 0), 0);
    const previousPeriodAverage = prevDays > 0 ? prevTotal / prevDays : 0;

    // 3. Build hourly trend for chart (as before)
    const pipeline = [
      {
        $match: {
          location: locationId,
          readAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: "machines",
          localField: "machine",
          foreignField: "_id",
          as: "machineDetails"
        }
      },
      { $unwind: "$machineDetails" },
      {
        $lookup: {
          from: "gaminglocations",
          localField: "location",
          foreignField: "_id",
          as: "locationDetails"
        }
      },
      { $unwind: "$locationDetails" },
      ...(licencee ? [{ $match: { "locationDetails.rel.licencee": licencee } }] : []),
      {
        $group: {
          _id: {
            hour: { $hour: "$readAt" },
            day: { $dateToString: { format: "%Y-%m-%d", date: "$readAt" } }
          },
          revenue: {
            $sum: {
              $subtract: [
                { $ifNull: ["$movement.drop", 0] },
                { $ifNull: ["$movement.totalCancelledCredits", 0] }
              ]
            }
          },
          drop: { $sum: { $ifNull: ["$movement.drop", 0] } },
          cancelledCredits: { $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] } }
        }
      },
      { $sort: { "_id.day": 1, "_id.hour": 1 } },
      {
        $project: {
          _id: 0,
          hour: "$_id.hour",
          day: "$_id.day",
          revenue: "$revenue",
          drop: "$drop",
          cancelledCredits: "$cancelledCredits"
        }
      }
    ];
    const hourlyData = await db.collection("meters").aggregate(pipeline).toArray();
    const hourSums: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourSums[i] = { total: 0, count: 0 };
    }
    for (const item of hourlyData) {
      const hour = typeof item.hour === 'number' ? item.hour : parseInt(item.hour, 10);
      if (hour >= 0 && hour < 24) {
        hourSums[hour].total += item.revenue;
        hourSums[hour].count += 1;
      }
    }
    const hourlyTrends = Array.from({ length: 24 }, (_, hour) => {
      const sum = hourSums[hour].total;
      const count = hourSums[hour].count;
      const avgRevenue = count > 0 ? sum / count : 0;
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        revenue: Math.round(avgRevenue)
      };
    });

    return NextResponse.json({
      locationId,
      timePeriod,
      hourlyTrends,
      currentPeriodRevenue,
      previousPeriodAverage,
      totalRevenue: hourlyTrends.reduce((sum, item) => sum + item.revenue, 0),
      peakRevenue: Math.max(...hourlyTrends.map(item => item.revenue)),
      avgRevenue: Math.round(hourlyTrends.reduce((sum, item) => sum + item.revenue, 0) / 24)
    });

  } catch (error) {
    console.error("Error fetching hourly trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch hourly trends" },
      { status: 500 }
    );
  }
} 