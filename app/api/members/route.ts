import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  applyCurrencyConversionToMetrics,
  shouldApplyCurrencyConversion,
} from '@/app/api/lib/helpers/currency/helper';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Member } from '@/app/api/lib/models/members';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { PipelineStage } from 'mongoose';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching members
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const sortBy = searchParams.get('sortBy') || 'createdAt';
      const sortOrder = searchParams.get('sortOrder') || 'desc';
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const winLossFilter = searchParams.get('winLossFilter');
      const locationFilter = searchParams.get('locationFilter');
      const displayCurrency = searchParams.get('currency') || 'USD';
      const licencee = searchParams.get('licencee') || null;

      const query: Record<string, unknown> = {};

      if (search) {
        query.$or = [
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { _id: { $regex: search, $options: 'i' } },
        ];
      }

      if (startDate || endDate) {
        const dateFilter: Record<string, unknown> = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        query.createdAt = dateFilter;
      }

      if (locationFilter && locationFilter !== 'all') {
        if (locationFilter.includes(',')) {
          query.gamingLocation = { $in: locationFilter.split(',') };
        } else {
          query.gamingLocation = locationFilter;
        }
      }

      let relevanceStage: PipelineStage | null = null;
      if (search) {
        const searchTermLower = search.trim();
        relevanceStage = {
          $addFields: {
            relevanceScore: {
              $add: [
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $ifNull: ['$profile.firstName', ''] },
                        regex: `^${searchTermLower}`,
                        options: 'i',
                      },
                    },
                    20,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $ifNull: ['$profile.lastName', ''] },
                        regex: `^${searchTermLower}`,
                        options: 'i',
                      },
                    },
                    20,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $ifNull: ['$username', ''] },
                        regex: `^${searchTermLower}`,
                        options: 'i',
                      },
                    },
                    10,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toString: '$_id' },
                        regex: `^${searchTermLower}`,
                        options: 'i',
                      },
                    },
                    10,
                    0,
                  ],
                },
              ],
            },
          },
        };
      }

      const sortOptions: Record<string, number> = {};
      if (search) sortOptions['relevanceScore'] = -1;

      if (sortBy === 'name') {
        sortOptions['profile.firstName'] = sortOrder === 'asc' ? 1 : -1;
      } else {
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      const pipeline: PipelineStage[] = [
        { $match: query },
        {
          $lookup: {
            from: 'gaminglocations',
            localField: 'gamingLocation',
            foreignField: '_id',
            as: 'locationInfo',
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
            locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
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
          },
        },
        {
          $addFields: {
            winLoss: { $subtract: ['$totalMoneyIn', '$totalMoneyOut'] },
            grossRevenue: { $subtract: ['$totalMoneyIn', '$totalMoneyOut'] },
          },
        },
      ];

      if (winLossFilter && winLossFilter !== 'all') {
        if (winLossFilter === 'positive')
          pipeline.push({ $match: { winLoss: { $gt: 0 } } });
        else if (winLossFilter === 'negative')
          pipeline.push({ $match: { winLoss: { $lt: 0 } } });
      }

      if (relevanceStage) pipeline.push(relevanceStage);
      pipeline.push({ $sort: sortOptions as Record<string, 1 | -1> });

      const countResult = await Member.aggregate([
        ...pipeline,
        { $count: 'total' },
      ]);
      const totalMembers = countResult[0]?.total || 0;

      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });

      const members = await Member.aggregate(pipeline);

      const convertedMembers = await applyCurrencyConversionToMetrics(
        members,
        licencee,
        displayCurrency as CurrencyCode
      );

      return NextResponse.json({
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
      });
    } catch (error) {
      console.error(`[Members API GET] Error:`, error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * Main POST handler for creating a new member
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser }) => {
    try {
      const body = await request.json();
      const trimmedFirstName = body.profile?.firstName?.trim();
      const trimmedLastName = body.profile?.lastName?.trim();
      const trimmedUsername = body.username?.trim();

      if (!trimmedFirstName || !trimmedLastName || !trimmedUsername) {
        return NextResponse.json(
          { error: 'First name, last name, and username are required' },
          { status: 400 }
        );
      }

      const existingMember = await Member.findOne({
        username: trimmedUsername,
      });
      if (existingMember) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }

      const memberId = await generateMongoId();
      const newMember = new Member({
        _id: memberId,
        username: trimmedUsername,
        profile: {
          ...body.profile,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        },
        gamingLocation: body.gamingLocation || 'default',
        createdAt: new Date(),
        updatedAt: new Date(),
        // ... include other default fields as per schema requirements
      });

      await newMember.save();

      if (currentUser?._id) {
        await logActivity({
          action: 'CREATE',
          details: `Created new member "${trimmedFirstName} ${trimmedLastName}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: (currentUser.username as string) || 'unknown',
          metadata: {
            resourceId: newMember._id,
            resourceName: `${trimmedFirstName} ${trimmedLastName}`,
          },
        });
      }

      return NextResponse.json(newMember, { status: 201 });
    } catch (error) {
      console.error(`[Members API POST] Error:`, error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
