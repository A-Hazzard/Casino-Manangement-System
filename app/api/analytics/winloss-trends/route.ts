import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getDatesForTimePeriod } from '@/lib/utils/dates';
import { TimePeriod } from '@/shared/types';

export async function GET(req: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const locationIds = searchParams.get('locationIds'); // Comma-separated location IDs

    // Get date range
    const { startDate, endDate } = getDatesForTimePeriod(timePeriod);

    // Build aggregation pipeline
    const pipeline = [
      // Match meters for the time period
      {
        $match: {
          readAt: { $gte: startDate, $lte: endDate },
        },
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
      // Filter by specific locations if provided
      ...(locationIds
        ? [
            {
              $match: {
                location: { $in: locationIds.split(',').map(id => id.trim()) },
              },
            },
          ]
        : []),
      // Group by time period
      {
        $group: {
          _id: {
            $dateToString: {
              format:
                timePeriod === 'Today' || timePeriod === 'Yesterday'
                  ? '%H:00'
                  : '%Y-%m-%d',
              date: '$readAt',
            },
          },
          winLoss: {
            $sum: {
              $subtract: [
                { $ifNull: ['$movement.drop', 0] },
                { $ifNull: ['$movement.totalCancelledCredits', 0] },
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      // Sort by time
      {
        $sort: { _id: 1 },
      },
      // Project final format
      {
        $project: {
          _id: 0,
          time: '$_id',
          winLoss: '$winLoss',
        },
      },
    ];

    const winLossTrends = await db
      .collection('meters')
      .aggregate(pipeline)
      .toArray();

    return NextResponse.json({
      success: true,
      data: winLossTrends,
      timePeriod,
      locationIds: locationIds ? locationIds.split(',') : null,
    });
  } catch (error) {
    console.error('Error fetching win/loss trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch win/loss trends' },
      { status: 500 }
    );
  }
}
