/**
 * Sessions API Route
 *
 * This route handles fetching machine sessions with filtering and pagination.
 * It supports:
 * - Search functionality (session ID, machine ID, member ID)
 * - Licensee filtering through machine-location-licensee relationship
 * - Date filtering (predefined periods or custom date ranges)
 * - Pagination and sorting
 * - Aggregation with machine, location, and licensee data
 *
 * @module app/api/sessions/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineSession } from '@/app/api/lib/models/machineSessions';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching sessions
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (pagination, search, sorting, filters)
 * 3. Build base query with search and date filters
 * 4. Build aggregation pipeline for count
 * 5. Build aggregation pipeline for data with lookups
 * 6. Execute aggregation pipelines
 * 7. Return paginated sessions
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'startTime';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const licencee =
      searchParams.get('licencee') || searchParams.get('licensee') || '';
    const dateFilter = searchParams.get('dateFilter') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // ============================================================================
    // STEP 3: Build base query with search and date filters
    // ============================================================================
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { _id: { $regex: search, $options: 'i' } },
        { machineId: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
      ];
    }

    // Licensee filtering will be handled in aggregation pipeline
    // Date filtering - support both dateFilter and startDate/endDate
    if (startDateParam && endDateParam) {
      // Use explicit date range if provided
      query.startTime = {
        $gte: new Date(startDateParam),
        $lte: new Date(endDateParam),
      };
    } else if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date | undefined;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999
          );
          break;
        case 'yesterday':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1
          );
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1,
            23,
            59,
            59,
            999
          );
          break;
        case 'week':
        case 'last7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'month':
        case 'last30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        default:
          startDate = new Date(0);
      }

      if (endDate) {
        query.startTime = { $gte: startDate, $lte: endDate };
      } else {
        query.startTime = { $gte: startDate };
      }
    }

    // ============================================================================
    // STEP 4: Build aggregation pipeline for count
    // ============================================================================
    const countPipeline = [
      // Stage 1: Match sessions based on search and date filters
      { $match: query },
      // Stage 2: Lookup machine details for each session
      {
        $lookup: {
          from: 'machines',
          localField: 'machineId',
          foreignField: '_id',
          as: 'machine',
        },
      },
      // Stage 3: Unwind machine array (preserve sessions with no machine)
      {
        $unwind: {
          path: '$machine',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Stage 4: Lookup location details for each machine
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'machine.gamingLocation',
          foreignField: '_id',
          as: 'location',
        },
      },
      // Stage 5: Unwind location array (preserve machines with no location)
      {
        $unwind: {
          path: '$location',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Stage 6: Lookup licencee details for each location
      {
        $lookup: {
          from: 'licencees',
          localField: 'location.rel.licencee',
          foreignField: '_id',
          as: 'licencee',
        },
      },
      // Stage 7: Unwind licencee array (preserve locations with no licencee)
      {
        $unwind: {
          path: '$licencee',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Stage 8: Filter by licencee if specified
      ...(licencee && licencee !== 'All Licensees'
        ? [
            {
              $match: {
                'licencee.name': licencee,
              },
            },
          ]
        : []),
      // Stage 9: Count total sessions
      {
        $count: 'total',
      },
    ];

    // ============================================================================
    // STEP 5: Build aggregation pipeline for data with lookups
    // ============================================================================
    const countResult = await MachineSession.aggregate(countPipeline);
    const totalSessions = countResult.length > 0 ? countResult[0].total : 0;

    // ============================================================================
    // STEP 6: Execute aggregation pipeline for sessions data
    // ============================================================================
    const sessions = await MachineSession.aggregate([
      // Stage 1: Match sessions based on search and date filters
      { $match: query },
      // Stage 2: Lookup machine details for each session
      {
        $lookup: {
          from: 'machines',
          localField: 'machineId',
          foreignField: '_id',
          as: 'machine',
        },
      },
      // Stage 3: Unwind machine array (preserve sessions with no machine)
      {
        $unwind: {
          path: '$machine',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Stage 4: Lookup location details for each machine
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'machine.gamingLocation',
          foreignField: '_id',
          as: 'location',
        },
      },
      // Stage 5: Unwind location array (preserve machines with no location)
      {
        $unwind: {
          path: '$location',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Stage 6: Lookup licencee details for each location
      {
        $lookup: {
          from: 'licencees',
          localField: 'location.rel.licencee',
          foreignField: '_id',
          as: 'licencee',
        },
      },
      // Stage 7: Unwind licencee array (preserve locations with no licencee)
      {
        $unwind: {
          path: '$licencee',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Stage 8: Filter by licencee if specified
      ...(licencee && licencee !== 'All Licensees'
        ? [
            {
              $match: {
                'licencee.name': licencee,
              },
            },
          ]
        : []),
      // Stage 9: Lookup member details for each session
      {
        $lookup: {
          from: 'members',
          localField: 'memberId',
          foreignField: '_id',
          as: 'member',
        },
      },
      // Stage 10: Unwind member array (preserve sessions with no member)
      {
        $unwind: {
          path: '$member',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Stage 11: Add computed fields
      {
        $addFields: {
          machineName: {
            $ifNull: [
              '$machine.custom.name',
              '$machine.serialNumber',
              'Unknown',
            ],
          },
          memberName: {
            $cond: {
              if: { $ne: ['$member', null] },
              then: {
                $concat: [
                  { $ifNull: ['$member.profile.firstName', ''] },
                  ' ',
                  { $ifNull: ['$member.profile.lastName', ''] },
                ],
              },
              else: null,
            },
          },
        },
      },
      // Stage 12: Sort sessions by specified field and order
      {
        $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      },
      // Stage 13: Apply pagination (skip records)
      {
        $skip: (page - 1) * limit,
      },
      // Stage 14: Apply pagination (limit records)
      {
        $limit: limit,
      },
      // Stage 15: Project final fields and calculate duration
      {
        $project: {
          _id: 1,
          sessionId: '$_id',
          machineId: 1,
          machineName: 1,
          machineSerialNumber: '$machine.serialNumber',
          machineCustomName: '$machine.custom.name',
          machineGame: '$machine.game',
          locationName: { $ifNull: ['$location.name', 'Unknown Location'] },
          memberId: 1,
          memberName: 1,
          startTime: 1,
          endTime: 1,
          gamesPlayed: 1,
          points: 1,
          status: {
            $cond: {
              if: { $eq: ['$endTime', null] },
              then: 'active',
              else: 'completed',
            },
          },
          handle: { $ifNull: ['$startMeters.drop', 0] },
          cancelledCredits: {
            $ifNull: ['$startMeters.totalCancelledCredits', 0],
          },
          jackpot: { $ifNull: ['$startMeters.jackpot', 0] },
          won: { $ifNull: ['$startMeters.totalWonCredits', 0] },
          bet: { $ifNull: ['$startMeters.coinIn', 0] },
          gamesWon: 1,
          totalPlays: '$gamesPlayed',
          totalWin: { $ifNull: ['$startMeters.totalWonCredits', 0] },
          totalLoss: {
            $subtract: [
              { $ifNull: ['$startMeters.coinIn', 0] },
              { $ifNull: ['$startMeters.totalWonCredits', 0] },
            ],
          },
          duration: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$startTime', null] },
                  { $ne: ['$endTime', null] },
                ],
              },
              then: {
                $divide: [
                  { $subtract: ['$endTime', '$startTime'] },
                  60000, // Convert to minutes
                ],
              },
              else: null,
            },
          },
        },
      },
    ]);

    // ============================================================================
    // STEP 7: Return paginated sessions
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(`[Sessions API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalSessions / limit),
          totalSessions,
          hasNextPage: page < Math.ceil(totalSessions / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Sessions API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
