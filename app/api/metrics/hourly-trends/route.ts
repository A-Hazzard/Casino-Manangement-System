import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getDatesForTimePeriod } from '@/app/api/lib/utils/dates';
import { TimePeriod } from '@/app/api/lib/types';

type HourlyDataItem = {
  location: string;
  hour: number;
  revenue: number;
  drop: number;
  cancelledCredits: number;
};

type DailyRevenueItem = {
  _id: { day: string };
  dailyRevenue: number;
};

function getPreviousPeriod(startDate: Date, endDate: Date, days: number) {
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(
    prevEnd.getTime() - days * 24 * 60 * 60 * 1000 + 1
  );
  return { prevStart, prevEnd };
}

export async function GET(req: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      console.error('Database connection not established');
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const locationIds = searchParams.get('locationIds'); // Support multiple location IDs
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!locationId && !locationIds) {
      return NextResponse.json(
        { error: 'Location ID or Location IDs are required' },
        { status: 400 }
      );
    }

    // Get date range - handle both timePeriod and startDate/endDate parameters
    let startDate: Date | undefined, endDate: Date | undefined;

    if (startDateParam && endDateParam) {
      // Use provided startDate and endDate
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Use timePeriod to calculate date range
      const dateRange = getDatesForTimePeriod(timePeriod);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // For All Time, we need to set a reasonable default range or handle differently
    if (!startDate || !endDate) {
      // For All Time in hourly trends, default to last 7 days to avoid performance issues
      const now = new Date();
      endDate = now;
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Determine which locations to query
    const targetLocations = locationIds
      ? locationIds.split(',').map(id => id.trim())
      : [locationId!];

    // 1. Fetch current period revenue (actual total for this period)
    const currentPipeline = [
      {
        $match: {
          location: { $in: targetLocations },
          readAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $subtract: [
                { $ifNull: ['$movement.drop', 0] },
                { $ifNull: ['$movement.totalCancelledCredits', 0] },
              ],
            },
          },
        },
      },
    ];
    const currentResult = await db
      .collection('meters')
      .aggregate(currentPipeline)
      .toArray();
    const currentPeriodRevenue = currentResult[0]?.totalRevenue || 0;

    // 2. Fetch previous period average daily revenue (previous 7 days, not including current)
    const days = 7;
    const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate, days);
    const prevPipeline = [
      {
        $match: {
          location: { $in: targetLocations },
          readAt: { $gte: prevStart, $lte: prevEnd },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$readAt' } },
          },
          dailyRevenue: {
            $sum: {
              $subtract: [
                { $ifNull: ['$movement.drop', 0] },
                { $ifNull: ['$movement.totalCancelledCredits', 0] },
              ],
            },
          },
        },
      },
    ];
    const prevResult = (await db
      .collection('meters')
      .aggregate(prevPipeline)
      .toArray()) as DailyRevenueItem[];
    const prevDays = prevResult.length;
    const prevTotal = prevResult.reduce(
      (sum: number, d: DailyRevenueItem) => sum + (d.dailyRevenue || 0),
      0
    );
    const previousPeriodAverage = prevDays > 0 ? prevTotal / prevDays : 0;

    // 3. Build hourly trend for chart with consistent calculations
    const pipeline = [
      {
        $match: {
          location: { $in: targetLocations },
          readAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: 'machines',
          localField: 'machine',
          foreignField: '_id',
          as: 'machineDetails',
        },
      },
      { $unwind: '$machineDetails' },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      { $unwind: '$locationDetails' },
      ...(licencee
        ? [{ $match: { 'locationDetails.rel.licencee': licencee } }]
        : []),
      {
        $group: {
          _id: {
            location: '$location',
            hour: { $hour: '$readAt' },
          },
          revenue: {
            $sum: {
              $subtract: [
                { $ifNull: ['$movement.drop', 0] },
                { $ifNull: ['$movement.totalCancelledCredits', 0] },
              ],
            },
          },
          drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
          cancelledCredits: {
            $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
          },
        },
      },
      { $sort: { '_id.location': 1, '_id.hour': 1 } },
      {
        $project: {
          _id: 0,
          location: '$_id.location',
          hour: '$_id.hour',
          revenue: '$revenue',
          drop: '$drop',
          cancelledCredits: '$cancelledCredits',
        },
      },
    ];
    const hourlyData = (await db
      .collection('meters')
      .aggregate(pipeline)
      .toArray()) as HourlyDataItem[];

    // Process data for multiple locations
    if (locationIds) {
      // Multiple locations - return data for each location
      const locationData: Record<
        string,
        {
          hourlyTrends: Array<{ hour: string; revenue: number }>;
          totalRevenue: number;
          peakRevenue: number;
          avgRevenue: number;
        }
      > = {};

      // Group data by location
      const locationGroups: Record<string, typeof hourlyData> = {};
      for (const item of hourlyData) {
        const locationId = item.location;
        if (!locationGroups[locationId]) {
          locationGroups[locationId] = [];
        }
        locationGroups[locationId].push(item);
      }

      // Process each location
      for (const locationId of targetLocations) {
        const locationHourlyData = locationGroups[locationId] || [];

        // Create hourly trends array for this location
        const hourlyTrends = Array.from({ length: 24 }, (_, hour) => {
          const hourData = locationHourlyData.find(
            (item: HourlyDataItem) => item.hour === hour
          );
          const revenue = hourData ? hourData.revenue : 0;
          return {
            hour: `${hour.toString().padStart(2, '0')}:00`,
            revenue: Math.round(revenue),
          };
        });

        // Calculate totals for this location
        const totalRevenue = hourlyTrends.reduce(
          (sum, item) => sum + item.revenue,
          0
        );
        const peakRevenue = Math.max(...hourlyTrends.map(item => item.revenue));
        const avgRevenue = Math.round(totalRevenue / 24);

        locationData[locationId] = {
          hourlyTrends,
          totalRevenue,
          peakRevenue,
          avgRevenue,
        };
      }

      return NextResponse.json({
        locationIds: targetLocations,
        timePeriod,
        locationData,
        currentPeriodRevenue,
        previousPeriodAverage,
      });
    } else {
      // Single location - return data in original format
      const hourlyTrends = Array.from({ length: 24 }, (_, hour) => {
        const hourData = hourlyData.find(
          (item: HourlyDataItem) => item.hour === hour
        );
        const revenue = hourData ? hourData.revenue : 0;
        return {
          hour: `${hour.toString().padStart(2, '0')}:00`,
          revenue: Math.round(revenue),
        };
      });

      // Calculate totals from the same dataset for consistency
      const totalRevenue = hourlyTrends.reduce(
        (sum, item) => sum + item.revenue,
        0
      );
      const peakRevenue = Math.max(...hourlyTrends.map(item => item.revenue));
      const avgRevenue = Math.round(totalRevenue / 24);

      // Validate data consistency
      if (peakRevenue > totalRevenue) {
        console.warn(
          `Data inconsistency detected: Peak (${peakRevenue}) > Total (${totalRevenue}) for location ${locationId}`
        );
      }

      return NextResponse.json({
        locationId,
        timePeriod,
        hourlyTrends,
        currentPeriodRevenue,
        previousPeriodAverage,
        totalRevenue,
        peakRevenue,
        avgRevenue,
      });
    }
  } catch (error) {
    console.error('Error fetching hourly trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hourly trends' },
      { status: 500 }
    );
  }
}
