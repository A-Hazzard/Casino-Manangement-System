import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Member } from '@/app/api/lib/models/members';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '../lib/helpers/users';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { PipelineStage } from 'mongoose';
import {
  getCurrencyFromQuery,
  applyCurrencyConversionToMetrics,
  shouldApplyCurrencyConversion,
} from '@/app/api/lib/helpers/currencyHelper';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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

    // Use aggregation pipeline to get members with location names and win/loss data
    const pipeline: Record<string, unknown>[] = [];

    // Stage 1: Filter members by search criteria, date range, and location
    pipeline.push({ $match: query });

    // Stage 2: Join members with gaming locations to get location names
    pipeline.push({
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
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

    // Debug: Log some sample member info if needed
    if (members.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn(
        'Sample member info:',
        members.slice(0, 2).map(m => ({
          memberId: m._id,
          name: `${m.profile?.firstName} ${m.profile?.lastName}`,
          locationName: m.locationName,
          winLoss: m.winLoss,
        }))
      );
    }

    // Apply currency conversion if needed
    const convertedMembers = await applyCurrencyConversionToMetrics(
      members,
      licencee,
      displayCurrency
    );

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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.profile?.firstName || !body.profile?.lastName || !body.username) {
      return NextResponse.json(
        { error: 'First name, last name, and username are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingMember = await Member.findOne({ username: body.username });
    if (existingMember) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Create new member
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

    await newMember.save();

    // Log activity
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

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error('Error creating member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
