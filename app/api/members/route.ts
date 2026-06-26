/**
 * Members API Route
 *
 * Handles listing and creation of casino members.
 * - GET: paginated, searchable, filterable member list with currency conversion
 * - POST: create a new member
 *
 * @module app/api/members/route
 */

import {
  calculateChanges,
  logActivity,
} from '@/app/api/lib/helpers/activityLogger';
import {
  applyCurrencyConversionToMetrics,
  shouldApplyCurrencyConversion,
} from '@/app/api/lib/helpers/currency/helper';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { Member } from '@/app/api/lib/models/members';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { PipelineStage } from 'mongoose';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching members
 *
 * @param {string} search - Search string for name, username, or ID
 * @param {number} page - Page number for pagination (defaults to 1)
 * @param {number} limit - Items per page (defaults to 10)
 * @param {string} sortBy - Field to sort by (e.g., 'name', 'createdAt')
 * @param {string} sortOrder - 'asc' or 'desc'
 * @param {string} startDate - Filter by creation date start
 * @param {string} endDate - Filter by creation date end
 * @param {string} winLossFilter - 'positive', 'negative', or 'all'
 * @param {string} locationFilter - Filter by location ID(s)
 * @param {string} currency - Display currency code (e.g., 'USD', 'GYD')
 * @param {string} licencee - Licencee for currency conversion rules
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/members';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Parse query parameters
      // ============================================================================
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

      // ============================================================================
      // STEP 2: Resolve multi-tenant location scope for the requesting user
      // ============================================================================
      const userAccessibleLicencees =
        await getUserAccessibleLicenceesFromToken();
      const userLocationPermissions = ((
        currentUser?.resourcePermissions as
          | Record<string, { resources?: Array<{ _id: string }> }>
          | undefined
      )?.['gaming-locations']?.resources?.map(resource => resource._id) ||
        []) as string[];
      const allowedLocationIds = await getUserLocationFilter(
        userAccessibleLicencees,
        licencee || undefined,
        userLocationPermissions,
        userRoles
      );

      // Non-admin users with no accessible locations see nothing
      if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            members: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalMembers: 0,
              hasNextPage: false,
              hasPrevPage: false,
            },
          },
          currency: displayCurrency,
          converted: shouldApplyCurrencyConversion(licencee),
        });
      }

      // ============================================================================
      // STEP 3: Build query filter
      // ============================================================================
      const query: Record<string, unknown> = {
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      };

      // Scope members to the user's accessible locations (multi-tenant isolation)
      if (allowedLocationIds !== 'all') {
        query.gamingLocation = { $in: allowedLocationIds };
      }

      if (search) {
        query.$and = [
          { $or: query.$or as unknown[] },
          {
            $or: [
              { 'profile.firstName': { $regex: search, $options: 'i' } },
              { 'profile.lastName': { $regex: search, $options: 'i' } },
              { username: { $regex: search, $options: 'i' } },
              { _id: { $regex: search, $options: 'i' } },
            ],
          },
        ];
        delete query.$or;
      }

      if (startDate || endDate) {
        const dateFilter: Record<string, unknown> = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        query.createdAt = dateFilter;
      }

      if (locationFilter && locationFilter !== 'all') {
        const requestedLocations = locationFilter.includes(',')
          ? locationFilter.split(',')
          : [locationFilter];
        // Intersect requested locations with the user's allowed scope so a
        // location filter can never widen access beyond assigned locations.
        const scopedLocations =
          allowedLocationIds === 'all'
            ? requestedLocations
            : requestedLocations.filter(locationId =>
                allowedLocationIds.includes(locationId)
              );
        query.gamingLocation = { $in: scopedLocations };
      }

      // ============================================================================
      // STEP 4: Build relevance and sort options
      // ============================================================================
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

      // ============================================================================
      // STEP 5: Build aggregation pipeline
      // ============================================================================
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

      // ============================================================================
      // STEP 6: Execute aggregation and calculate pagination
      // ============================================================================
      const countResult = await Member.aggregate([
        ...pipeline,
        { $count: 'total' },
      ]);
      const totalMembers = countResult[0]?.total || 0;

      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });

      const members = await Member.aggregate(pipeline);

      // ============================================================================
      // STEP 7: Apply currency conversion
      // ============================================================================
      const convertedMembers = await applyCurrencyConversionToMetrics(
        members,
        licencee,
        displayCurrency as CurrencyCode
      );

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/members',
        convertedMembers.length,
        user,
        duration
      );

      // ============================================================================
      // STEP 8: Return success response
      // ============================================================================
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
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      logRouteError(functionName, 'GET', '/api/members', errorMessage, user);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * Main POST handler for creating a new member
 *
 * @body {Object} profile - REQUIRED. Member profile data (firstName, lastName, etc.)
 * @body {string} username - REQUIRED. Unique username for the member
 * @body {string} gamingLocation - Optional. ID of the member's primary gaming location
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/members';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser }) => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request body
      // ============================================================================
      const body = await request.json();
      const trimmedFirstName = body.profile?.firstName?.trim();
      const trimmedLastName = body.profile?.lastName?.trim();
      const trimmedUsername = body.username?.trim();

      if (!trimmedFirstName || !trimmedLastName || !trimmedUsername) {
        logRouteError(
          functionName,
          'POST',
          '/api/members',
          'Missing required fields',
          user
        );
        return NextResponse.json(
          { error: 'First name, last name, and username are required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Check username uniqueness
      // ============================================================================
      const existingMember = await Member.findOne({
        username: trimmedUsername,
      });
      if (existingMember) {
        logRouteError(
          functionName,
          'POST',
          '/api/members',
          'Username already exists',
          user
        );
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Create member entry
      // ============================================================================
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

      const duration = Date.now() - startTime;
      logRouteCreate(functionName, 'POST', '/api/members', 1, user, duration);

      // ============================================================================
      // STEP 4: Log activity
      // ============================================================================
      if (currentUser?._id) {
        try {
          const changes = calculateChanges(
            {},
            newMember.toObject ? newMember.toObject() : newMember
          );

          await logActivity({
            action: 'CREATE',
            details: `Created new member "${trimmedFirstName} ${trimmedLastName}"`,
            ipAddress: getClientIP(request) || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            userId: currentUser._id as string,
            username:
              (currentUser.username as string) ||
              (currentUser.emailAddress as string) ||
              'unknown',
            metadata: {
              resource: 'member',
              resourceId: newMember._id,
              resourceName: `${trimmedFirstName} ${trimmedLastName}`,
              changes,
              previousData: null,
              newData: newMember.toObject ? newMember.toObject() : newMember,
            },
          });
        } catch (logError) {
          console.error('Failed to log activity:', logError);
        }
      }

      // ============================================================================
      // STEP 5: Return success response
      // ============================================================================
      return NextResponse.json(newMember, { status: 201 });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      logRouteError(functionName, 'POST', '/api/members', errorMessage, user);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
