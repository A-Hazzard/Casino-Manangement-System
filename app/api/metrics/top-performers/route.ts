import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getDatesForTimePeriod } from '@/app/api/lib/utils/dates';
import { TimePeriod } from '@/app/api/lib/types';

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
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
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

      // For All Time, provide reasonable defaults if needed
      if (!startDate || !endDate) {
        const now = new Date();
        endDate = now;
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      }
    }

    // Build aggregation pipeline for top performing machines
    const pipeline = [
      // Match meters for the specific location and time period
      {
        $match: {
          location: locationId,
          readAt: { $gte: startDate, $lte: endDate },
        },
      },
      // Lookup machine details
      {
        $lookup: {
          from: 'machines',
          localField: 'machine',
          foreignField: '_id',
          as: 'machineDetails',
        },
      },
      {
        $unwind: '$machineDetails',
      },
      // Lookup location details
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: '$locationDetails',
      },
      // Filter by licencee if provided
      ...(licencee
        ? [
            {
              $match: {
                'locationDetails.rel.licencee': licencee,
              },
            },
          ]
        : []),
      // Group by machine
      {
        $group: {
          _id: '$machine',
          machineName: { $first: '$machineDetails.Custom.name' },
          serialNumber: { $first: '$machineDetails.serialNumber' },
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
          gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
        },
      },
      // Calculate hold percentage
      {
        $addFields: {
          holdPercentage: {
            $cond: [
              { $gt: ['$drop', 0] },
              { $multiply: [{ $divide: ['$revenue', '$drop'] }, 100] },
              0,
            ],
          },
        },
      },
      // Sort by revenue (descending)
      {
        $sort: { revenue: -1 },
      },
      // Limit to top 1
      {
        $limit: 1,
      },
      // Project final format
      {
        $project: {
          _id: 0,
          machineId: '$_id',
          machineName: {
            $cond: [
              { $ne: ['$machineName', null] },
              '$machineName',
              { $concat: ['Machine ', '$serialNumber'] },
            ],
          },
          revenue: '$revenue',
          holdPercentage: { $round: ['$holdPercentage', 1] },
          drop: '$drop',
          cancelledCredits: '$cancelledCredits',
          gamesPlayed: '$gamesPlayed',
        },
      },
    ];

    const topPerformers = await db
      .collection('meters')
      .aggregate(pipeline)
      .toArray();

    return NextResponse.json({
      locationId,
      timePeriod,
      topPerformer: topPerformers[0] || null,
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top performers' },
      { status: 500 }
    );
  }
}
