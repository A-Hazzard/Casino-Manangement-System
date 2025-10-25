import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getDatesForTimePeriod } from '@/app/api/lib/utils/dates';
import { TimePeriod } from '@/app/api/lib/types';

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
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get date range
    const { startDate, endDate } = getDatesForTimePeriod(timePeriod);

    // Build aggregation pipeline
    const pipeline = [
      // Stage 1: Filter meter records by date range
      {
        $match: {
          readAt: { $gte: startDate, $lte: endDate },
        },
      },

      // Stage 2: Join meters with machines to get machine details
      {
        $lookup: {
          from: 'machines',
          localField: 'machine',
          foreignField: '_id',
          as: 'machineDetails',
        },
      },

      // Stage 3: Flatten the machine details array (each meter now has machine info)
      {
        $unwind: '$machineDetails',
      },

      // Stage 4: Join with gaming locations to get location details
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },

      // Stage 5: Flatten the location details array (each meter now has location info)
      {
        $unwind: '$locationDetails',
      },

      // Stage 6: Filter by licensee if provided
      ...(licencee
        ? [
            {
              $match: {
                'locationDetails.rel.licencee': licencee,
              },
            },
          ]
        : []),

      // Stage 7: Filter by specific locations if provided
      ...(locationIds
        ? [
            {
              $match: {
                location: { $in: locationIds.split(',').map(id => id.trim()) },
              },
            },
          ]
        : []),
      // Stage 8: Group by machine to aggregate financial and gaming metrics
      {
        $group: {
          _id: '$machine',
          locationId: { $first: '$location' },
          locationName: { $first: '$locationDetails.name' },
          machineId: { $first: '$machineDetails.serialNumber' },
          game: { $first: '$machineDetails.game' },
          manufacturer: {
            $first: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$machineDetails.manufacturer', null] },
                    { $ne: ['$machineDetails.manufacturer', ''] },
                  ],
                },
                '$machineDetails.manufacturer',
                {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$machineDetails.manuf', null] },
                        { $ne: ['$machineDetails.manuf', ''] },
                      ],
                    },
                    '$machineDetails.manuf',
                    'Not Specified',
                  ],
                },
              ],
            },
          },
          handle: { $sum: { $ifNull: ['$movement.drop', 0] } },
          winLoss: {
            $sum: {
              $subtract: [
                { $ifNull: ['$movement.drop', 0] },
                { $ifNull: ['$movement.totalCancelledCredits', 0] },
              ],
            },
          },
          jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
          avgWagerPerGame: {
            $avg: {
              $cond: [
                { $gt: [{ $ifNull: ['$movement.gamesPlayed', 0] }, 0] },
                {
                  $divide: [
                    { $ifNull: ['$movement.drop', 0] },
                    { $ifNull: ['$movement.gamesPlayed', 1] },
                  ],
                },
                0,
              ],
            },
          },
          actualHold: {
            $avg: {
              $cond: [
                { $gt: [{ $ifNull: ['$movement.drop', 0] }, 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            { $ifNull: ['$movement.drop', 0] },
                            { $ifNull: ['$movement.totalCancelledCredits', 0] },
                          ],
                        },
                        { $ifNull: ['$movement.drop', 1] },
                      ],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
          gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
        },
      },

      // Stage 9: Sort by handle in descending order (highest performers first)
      {
        $sort: { handle: -1 },
      },

      // Stage 10: Limit to top N machines
      {
        $limit: limit,
      },

      // Stage 11: Project final response format with rounded values
      {
        $project: {
          _id: 0,
          locationId: '$locationId',
          locationName: { $ifNull: ['$locationName', 'Unknown Location'] },
          machineId: { $ifNull: ['$machineId', 'Unknown Machine'] },
          game: { $ifNull: ['$game', 'Unknown Game'] },
          manufacturer: { $ifNull: ['$manufacturer', 'Not Specified'] },
          handle: { $round: ['$handle', 2] },
          winLoss: { $round: ['$winLoss', 2] },
          jackpot: { $round: ['$jackpot', 2] },
          avgWagerPerGame: { $round: ['$avgWagerPerGame', 2] },
          actualHold: { $round: ['$actualHold', 2] },
          gamesPlayed: '$gamesPlayed',
        },
      },
    ];

    const topMachines = await db
      .collection('meters')
      .aggregate(pipeline)
      .toArray();

    return NextResponse.json({
      success: true,
      data: topMachines,
      timePeriod,
      locationIds: locationIds ? locationIds.split(',') : null,
      limit,
    });
  } catch (error) {
    console.error('Error fetching top machines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top machines' },
      { status: 500 }
    );
  }
}
