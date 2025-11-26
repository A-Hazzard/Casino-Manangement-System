/**
 * Members Summary API Route
 *
 * This route handles fetching members summary with filtering and pagination.
 * It supports:
 * - Licensee-based filtering
 * - Location filtering
 * - Date filtering (yesterday, week, month, custom)
 * - Search functionality
 * - Pagination
 * - Financial metrics calculation (win/loss, gross revenue)
 *
 * @module app/api/members/summary/route
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Member } from '@/app/api/lib/models/members';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching members summary
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters
 * 3. Build date filter conditions
 * 4. Handle licensee filtering through location lookup
 * 5. Add location and search filters
 * 6. Get total count for pagination
 * 7. Aggregate member data with financial metrics
 * 8. Calculate summary statistics
 * 9. Return paginated results with summary
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
    const licencee = searchParams.get('licencee') || '';
    const dateFilter = searchParams.get('dateFilter') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchTerm = searchParams.get('search') || '';
    const locationFilter = searchParams.get('location') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const filterBy = searchParams.get('filterBy') || 'createdAt';
    const skip = (page - 1) * limit;

    // ============================================================================
    // STEP 3: Build date filter conditions
    // ============================================================================
    const matchConditions: Record<string, unknown> = {};

    // Add date filter only if not "all"
    if (dateFilter !== 'all') {
      let dateQuery: Record<string, unknown> = {};
      const dateField = filterBy === 'lastLogin' ? 'lastLogin' : 'createdAt';

      if (dateFilter === 'custom' && startDate && endDate) {
        dateQuery = {
          [dateField]: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        };
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        dateQuery = {
          [dateField]: {
            $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
            $lt: new Date(yesterday.setHours(23, 59, 59, 999)),
          },
        };
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateQuery = {
          [dateField]: { $gte: weekAgo },
        };
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateQuery = {
          [dateField]: { $gte: monthAgo },
        };
      }
      if (Object.keys(dateQuery).length > 0) {
        Object.assign(matchConditions, dateQuery);
      }
    }

    // ============================================================================
    // STEP 4: Handle licensee filtering through location lookup
    // ============================================================================
    if (licencee && licencee !== 'All Licensees' && licencee !== 'all') {
      // console.log("API - Members Summary - Filtering by licencee:", licencee);

      // Get locations for this licencee
      const locations = await GamingLocations.find(
        {
          'rel.licencee': licencee,
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
        { _id: 1, name: 1 }
      ).lean();

      const locationIds = locations.map(loc => loc._id);
      // console.log("API - Members Summary - Found location IDs:", locationIds);

      if (locationIds.length === 0) {
        // No locations found for this licencee, return empty result

        return NextResponse.json({
          success: true,
          data: {
            members: [],
            summary: {
              totalMembers: 0,
              totalLocations: 0,
              recentMembers: 0,
            },
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalCount: 0,
              hasNextPage: false,
              hasPrevPage: false,
              limit,
            },
          },
        });
      }

      // Add location filter to match conditions
      if (locationFilter && locationFilter !== 'all') {
        // If specific location is selected, check if it belongs to the licencee
        if (!locationIds.includes(locationFilter)) {
          return NextResponse.json({
            success: true,
            data: {
              members: [],
              summary: {
                totalMembers: 0,
                totalLocations: 0,
                recentMembers: 0,
              },
              pagination: {
                currentPage: page,
                totalPages: 0,
                totalCount: 0,
                hasNextPage: false,
                hasPrevPage: false,
                limit,
              },
            },
          });
        }
        matchConditions.gamingLocation = locationFilter;
      } else {
        // Filter by all locations of this licencee
        matchConditions.gamingLocation = { $in: locationIds };
      }
    } else {
      // No licencee filter applied
      // console.log("API - Members Summary - No licencee filter applied");

      // Add location filter if specified
      if (locationFilter && locationFilter !== 'all') {
        matchConditions.gamingLocation = locationFilter;
      }
    }

    // ============================================================================
    // STEP 5: Add location and search filters
    // ============================================================================
    if (searchTerm) {
      matchConditions.$or = [
        { 'profile.firstName': { $regex: searchTerm, $options: 'i' } },
        { 'profile.lastName': { $regex: searchTerm, $options: 'i' } },
        { phoneNumber: { $regex: searchTerm, $options: 'i' } },
        { username: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // ============================================================================
    // STEP 6: Get total count for pagination
    // ============================================================================
    const totalCount = await Member.countDocuments(matchConditions);

    // ============================================================================
    // STEP 7: Aggregate member data with financial metrics
    // ============================================================================
    const memberSummary = await Member.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'gaminglocations',
          let: { memberLocation: '$gamingLocation' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$memberLocation'] },
                    { $eq: [{ $toString: '$_id' }, { $toString: '$$memberLocation' }] },
                    { $eq: ['$_id', { $toObjectId: { $ifNull: ['$$memberLocation', ''] } }] },
                  ],
                },
              },
            },
          ],
          as: 'location',
        },
      },
      {
        $lookup: {
          from: 'machinesessions',
          localField: '_id',
          foreignField: 'memberId',
          as: 'sessions',
        },
      },
      {
        $addFields: {
          locationName: {
            $ifNull: [
              { $arrayElemAt: ['$location.name', 0] },
              '$gamingLocation',
            ],
          },
          // Calculate financial metrics from sessions using correct fields from financial guide
          totalMoneyIn: {
            $reduce: {
              input: '$sessions',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $ifNull: [
                      { $toDouble: '$$this.endMeters.movement.drop' },
                      0,
                    ],
                  },
                ],
              },
            },
          },
          totalMoneyOut: {
            $reduce: {
              input: '$sessions',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $ifNull: [
                      {
                        $toDouble:
                          '$$this.endMeters.movement.totalCancelledCredits',
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
          totalHandle: {
            $reduce: {
              input: '$sessions',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $ifNull: [
                      { $toDouble: '$$this.endMeters.movement.coinIn' },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          winLoss: { $subtract: ['$totalMoneyIn', '$totalMoneyOut'] },
          grossRevenue: { $subtract: ['$totalMoneyIn', '$totalMoneyOut'] },
        },
      },
      {
        $project: {
          _id: 1,
          fullName: {
            $concat: [
              { $ifNull: ['$profile.firstName', ''] },
              ' ',
              { $ifNull: ['$profile.lastName', ''] },
            ],
          },
          address: { $ifNull: ['$profile.address', ''] },
          phoneNumber: { $ifNull: ['$phoneNumber', ''] },
          lastLogin: 1,
          createdAt: 1,
          locationName: 1,
          gamingLocation: 1,
          winLoss: 1,
          grossRevenue: 1,
          totalMoneyIn: 1,
          totalMoneyOut: 1,
          totalHandle: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    // ============================================================================
    // STEP 8: Calculate summary statistics
    // ============================================================================
    const summaryStats = {
      totalMembers: totalCount,
      totalLocations: new Set(
        memberSummary.map((m: Record<string, unknown>) => m.gamingLocation)
      ).size,
      recentMembers: memberSummary.filter((m: Record<string, unknown>) => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(m.createdAt as string) >= weekAgo;
      }).length,
    };

    // ============================================================================
    // STEP 9: Return paginated results with summary
    // ============================================================================
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Members Summary API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: {
        members: memberSummary,
        summary: summaryStats,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit,
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Members Summary API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
