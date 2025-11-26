/**
 * Members API Route
 *
 * This route handles CRUD operations for gaming members.
 * It supports:
 * - Fetching members with filtering, searching, and pagination
 * - Creating new members
 * - Financial metrics aggregation
 * - Currency conversion
 * - Location filtering
 * - Win/loss filtering
 *
 * @module app/api/members/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  applyCurrencyConversionToMetrics,
  getCurrencyFromQuery,
  shouldApplyCurrencyConversion,
} from '@/app/api/lib/helpers/currencyHelper';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Member } from '@/app/api/lib/models/members';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching members
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (search, pagination, filters)
 * 3. Build query filters
 * 4. Build aggregation pipeline
 * 5. Execute aggregation with pagination
 * 6. Apply currency conversion if needed
 * 7. Return paginated member list
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
    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Date filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Win/Loss filter
    const winLossFilter = searchParams.get('winLossFilter'); // "positive", "negative", "all"

    // Location filter
    const locationFilter = searchParams.get('locationFilter');

    // Currency parameters
    const displayCurrency = getCurrencyFromQuery(searchParams);
    const licencee = searchParams.get('licencee') || null;

    // ============================================================================
    // STEP 3: Build query filters
    // ============================================================================
    // Build optimized query
    const query: Record<string, unknown> = {};

    // Search by member name, username, or ID
    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { _id: { $regex: search, $options: 'i' } },
      ];
    }

    // Date filter for joined date
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
      query.createdAt = dateFilter;
    }

    // Location filter
    if (locationFilter && locationFilter !== 'all') {
      query.gamingLocation = locationFilter;
    }

    // Build optimized sort options with indexing considerations
    const sort: Record<string, number> = {};
    if (sortBy === 'name') {
      sort['profile.firstName'] = sortOrder === 'asc' ? 1 : -1;
      sort['profile.lastName'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'playerId') {
      sort['_id'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'lastSession') {
      sort['createdAt'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'winLoss') {
      sort['winLoss'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'joined') {
      sort['createdAt'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'location') {
      sort['locationName'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // ============================================================================
    // STEP 4: Build aggregation pipeline
    // ============================================================================
    // Use aggregation pipeline to get members with location names and win/loss data
    const pipeline: Record<string, unknown>[] = [];

    // Stage 1: Filter members by search criteria, date range, and location
    pipeline.push({ $match: query });

    // Stage 2: Join members with gaming locations to get location names
    // Handle both string and ObjectId formats for gamingLocation
    pipeline.push({
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
                  {
                    $eq: [
                      '$_id',
                      { $toObjectId: { $ifNull: ['$$memberLocation', ''] } },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: 'locationInfo',
      },
    });

    // Stage 3: Join members with their machine sessions to calculate financial metrics
    pipeline.push({
      $lookup: {
        from: 'machinesessions',
        localField: '_id',
        foreignField: 'memberId',
        as: 'sessions',
      },
    });

    // Stage 4: Calculate financial metrics from all member sessions
    pipeline.push({
      $addFields: {
        locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
        // Calculate total money in from all sessions (sum of drop values)
        totalMoneyIn: {
          $reduce: {
            input: '$sessions',
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                {
                  $ifNull: [{ $toDouble: '$$this.endMeters.movement.drop' }, 0],
                },
              ],
            },
          },
        },
        // Calculate total money out from all sessions (sum of cancelled credits)
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
        // Calculate total handle from all sessions (sum of coin in values)
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
    });

    // Stage 5: Calculate win/loss and gross revenue (Money In - Money Out)
    pipeline.push({
      $addFields: {
        winLoss: { $subtract: ['$totalMoneyIn', '$totalMoneyOut'] },
        grossRevenue: { $subtract: ['$totalMoneyIn', '$totalMoneyOut'] },
      },
    });

    // Stage 6: Filter by win/loss criteria if specified
    if (winLossFilter && winLossFilter !== 'all') {
      if (winLossFilter === 'positive') {
        pipeline.push({
          $match: {
            winLoss: { $gt: 0 },
          },
        });
      } else if (winLossFilter === 'negative') {
        pipeline.push({
          $match: {
            winLoss: { $lt: 0 },
          },
        });
      } else if (winLossFilter === 'zero') {
        pipeline.push({
          $match: {
            winLoss: { $eq: 0 },
          },
        });
      }
    }

    // Stage 7: Project only the fields needed for the response
    pipeline.push({
      $project: {
        _id: 1,
        profile: 1,
        username: 1,
        phoneNumber: 1,
        points: 1,
        uaccount: 1,
        createdAt: 1,
        updatedAt: 1,
        gamingLocation: 1,
        locationName: 1,
        loggedIn: 1,
        accountLocked: 1,
        lastLogin: 1,
        winLoss: 1,
        grossRevenue: 1,
        totalMoneyIn: 1,
        totalMoneyOut: 1,
        totalHandle: 1,
      },
    });

    // Stage 8: Sort results by specified criteria
    pipeline.push({ $sort: sort });

    // ============================================================================
    // STEP 5: Execute aggregation with pagination
    // ============================================================================
    // Stage 9: Get total count for pagination (reuse pipeline without pagination)
    const countPipeline = [
      ...pipeline,
      { $count: 'total' } as Record<string, unknown>,
    ];
    const countResult = await Member.aggregate(
      countPipeline as unknown as PipelineStage[]
    );
    const totalMembers = countResult[0]?.total || 0;

    // Stage 10: Apply pagination (skip and limit)
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // Execute aggregation
    const members = await Member.aggregate(
      pipeline as unknown as PipelineStage[]
    );

    // ============================================================================
    // STEP 6: Apply currency conversion if needed
    // ============================================================================
    // Apply currency conversion if needed
    const convertedMembers = await applyCurrencyConversionToMetrics(
      members,
      licencee,
      displayCurrency
    );

    // ============================================================================
    // STEP 7: Return paginated member list
    // ============================================================================
    const response = {
      success: true,
      data: {
        members: convertedMembers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMembers / limit),
          totalMembers,
          hasNextPage: page * limit < totalMembers,
          hasPrevPage: page > 1,
        },
      },
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
    };

    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(`[Members API GET] Completed in ${duration}ms`);
    }
    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Members API GET] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Main POST handler for creating a new member
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request body
 * 3. Validate required fields
 * 4. Check if username already exists
 * 5. Create new member document
 * 6. Save member to database
 * 7. Log activity
 * 8. Return created member
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body = await request.json();

    // ============================================================================
    // STEP 3: Validate required fields
    // ============================================================================
    if (!body.profile?.firstName || !body.profile?.lastName || !body.username) {
      return NextResponse.json(
        { error: 'First name, last name, and username are required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Check if username already exists
    // ============================================================================
    const existingMember = await Member.findOne({ username: body.username });
    if (existingMember) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Create new member document
    // ============================================================================
    const newMember = new Member({
      _id: body.username, // Use username as ID
      profile: {
        firstName: body.profile.firstName,
        lastName: body.profile.lastName,
        email: body.profile.email || '',
        occupation: body.profile.occupation || '',
        address: body.profile.address || '',
        gender: '',
        dob: '',
        indentification: {
          number: '',
          type: '',
        },
      },
      username: body.username,
      phoneNumber: body.phoneNumber || '',
      points: body.points || 0,
      uaccount: body.uaccount || 0,
      pin: body.pin || '0000',
      gamingLocation: body.gamingLocation || 'default', // Allow specifying gaming location
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // ============================================================================
    // STEP 6: Save member to database
    // ============================================================================
    await newMember.save();

    // ============================================================================
    // STEP 7: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          { field: 'username', oldValue: null, newValue: body.username },
          {
            field: 'firstName',
            oldValue: null,
            newValue: body.profile.firstName,
          },
          {
            field: 'lastName',
            oldValue: null,
            newValue: body.profile.lastName,
          },
          {
            field: 'email',
            oldValue: null,
            newValue: body.profile.email || '',
          },
          {
            field: 'phoneNumber',
            oldValue: null,
            newValue: body.phoneNumber || '',
          },
          {
            field: 'gamingLocation',
            oldValue: null,
            newValue: body.gamingLocation || 'default',
          },
        ];

        await logActivity({
          action: 'CREATE',
          details: `Created new member "${body.profile.firstName} ${body.profile.lastName}" with username "${body.username}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'member',
            resourceId: newMember._id,
            resourceName: `${body.profile.firstName} ${body.profile.lastName}`,
            changes: createChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 8: Return created member
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Members API POST] Completed in ${duration}ms`);
    }
    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Members API POST] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
