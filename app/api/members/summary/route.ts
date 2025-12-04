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

import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Member } from '@/app/api/lib/models/members';
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
    // Licensee filtering removed - show all members regardless of licensee
    const dateFilter = searchParams.get('dateFilter') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchTerm = searchParams.get('search') || '';
    const locationFilter = searchParams.get('location') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // ============================================================================
    // STEP 3: Build date filter conditions
    // ============================================================================
    // Base match conditions - exclude only members deleted in 2025 or later
    const matchConditions: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2025-01-01') } }, // Include items deleted before 2025
      ],
    };
    const dateFilterConditions: Record<string, unknown> = {};

    // Build date filter for sessions (not for members - we want to show all members)
    // Date filter will be applied to sessions lookup, not to member matching
    let sessionDateFilter: Record<string, unknown> = {};
    if (dateFilter !== 'all') {
      let dateQuery: Record<string, unknown> = {};
      // For sessions, we filter by session date, not member lastLogin/createdAt
      const dateField = 'startTime'; // Filter sessions by startTime

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
        sessionDateFilter = dateQuery;
        // Store for use in session lookup
        Object.assign(dateFilterConditions, dateQuery);
      }
    }

    // ============================================================================
    // STEP 4: Handle location filtering (licensee filtering removed - show all members)
    // ============================================================================
    // Add location filter if specified (but no licensee filtering)
    if (locationFilter && locationFilter !== 'all') {
      matchConditions.gamingLocation = locationFilter;
    }

    // ============================================================================
    // STEP 5: Add location and search filters
    // ============================================================================
    if (searchTerm) {
      // If we already have $or for deletedAt, we need to use $and to combine
      if (matchConditions.$or && Array.isArray(matchConditions.$or)) {
        const existingOr = matchConditions.$or;
        matchConditions.$and = [
          { $or: existingOr },
          {
            $or: [
              { 'profile.firstName': { $regex: searchTerm, $options: 'i' } },
              { 'profile.lastName': { $regex: searchTerm, $options: 'i' } },
              { phoneNumber: { $regex: searchTerm, $options: 'i' } },
              { username: { $regex: searchTerm, $options: 'i' } },
            ],
          },
        ];
        delete matchConditions.$or;
      } else {
        matchConditions.$or = [
          { 'profile.firstName': { $regex: searchTerm, $options: 'i' } },
          { 'profile.lastName': { $regex: searchTerm, $options: 'i' } },
          { phoneNumber: { $regex: searchTerm, $options: 'i' } },
          { username: { $regex: searchTerm, $options: 'i' } },
        ];
      }
    }

    // ============================================================================
    // STEP 6: Get total count for pagination (includes date filter)
    // ============================================================================
    const totalCount = await Member.countDocuments(matchConditions);

    // Get total members count (excluding date filter AND licensee/location filters) for summary stats
    // totalMembers should count ALL members in the system, not filtered by licensee/location
    const totalMembersConditions: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2025-01-01') } }, // Include items deleted before 2025
      ],
    };

    // Only include search filter if there's a search term (exclude licensee/location filters)
    if (searchTerm) {
      // Build search $or
      const searchOr = [
        { 'profile.firstName': { $regex: searchTerm, $options: 'i' } },
        { 'profile.lastName': { $regex: searchTerm, $options: 'i' } },
        { phoneNumber: { $regex: searchTerm, $options: 'i' } },
        { username: { $regex: searchTerm, $options: 'i' } },
      ];

      // Combine deletedAt with search using $and
      totalMembersConditions.$and = [
        { $or: totalMembersConditions.$or as unknown[] },
        { $or: searchOr },
      ];
      delete totalMembersConditions.$or;
    }

    // Explicitly ensure gamingLocation is NOT included (totalMembers should count ALL members)
    // This is a safety check - we're building from scratch so it shouldn't be there, but just in case
    delete totalMembersConditions.gamingLocation;

    const totalMembersCount = await Member.countDocuments(
      totalMembersConditions
    );

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
                    {
                      $eq: [
                        { $toString: '$_id' },
                        { $toString: '$$memberLocation' },
                      ],
                    },
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
          let: { memberId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$memberId', '$$memberId'],
                },
                // Apply date filter to sessions if specified (filter sessions by startTime)
                ...(Object.keys(sessionDateFilter).length > 0
                  ? sessionDateFilter
                  : {}),
              },
            },
          ],
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
    // Calculate active members (members who logged in within the last 30 days)
    // Active members should exclude date filter but include other filters (licensee, location, search)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build conditions for active members (exclude date filter AND licensee/location filters)
    // activeMembers should count ALL active members in the system, not filtered by licensee/location
    // Start with totalMembersConditions and add lastLogin filter
    const activeMembersConditions: Record<string, unknown> = JSON.parse(
      JSON.stringify(totalMembersConditions)
    );
    activeMembersConditions.lastLogin = { $gte: thirtyDaysAgo };

    // Get active members count from all members (not just paginated results)
    const activeMembersCount = await Member.countDocuments(
      activeMembersConditions
    );

    // Calculate total locations count from locations collection, not from member data
    // Only count membership-enabled locations that are not soft-deleted in 2025 or later
    let totalLocationsCount = 0;
    try {
      const locationMatchConditions: Record<string, unknown> = {
        membershipEnabled: true,
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } },
          { deletedAt: { $lt: new Date('2025-01-01') } }, // Include locations deleted before 2025
        ],
      };

      totalLocationsCount = await GamingLocations.countDocuments(
        locationMatchConditions
      );
    } catch (error) {
      console.warn('Failed to fetch total locations count:', error);
      // Fallback to counting unique locations from member data
      totalLocationsCount = new Set(
        memberSummary.map((m: Record<string, unknown>) => m.gamingLocation)
      ).size;
    }

    const summaryStats = {
      totalMembers: totalMembersCount, // Total members excluding date filter
      totalLocations: totalLocationsCount,
      activeMembers: activeMembersCount, // Members who logged in within last 30 days
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
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: hasNextPage,
          hasPrev: hasPrevPage,
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
