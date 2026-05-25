/**
 * Machine Status API Route
 *
 * This route handles fetching machine online/offline status based on lastActivity.
 * It supports:
 * - Filtering by licencee
 * - Role-based location filtering
 * - Online/offline counts based on lastActivity (3 minute threshold)
 * - Admin/Developer: all machines for selected licencee
 * - Other roles: only machines for assigned locations
 *
 * @module app/api/cabinets/status/route
 */

import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * Main GET handler for fetching machine status
 *
 * @param {string} licencee - Filter status by licencee name
 * @param {string} locationId - Filter status by specific location ID(s)
 * @param {string} machineTypeFilter - Filter by features ('LocalServersOnly', 'SMIBLocationsOnly', 'NoSMIBLocation', 'MembershipOnly')
 * @param {string} search - Search query for machine fields or location name
 * @param {string} onlineStatus - Filter return to only 'online', 'offline', or 'never-online' machines
 * @param {string} gameType - Comma-separated game types to filter by
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Authenticate user and get accessible locations
 * 4. Determine location filter based on user role and selected licencee
 * 5. Query machines with lastActivity and calculate online/offline status
 * 6. Return machine status counts
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/cabinets/status';
  const user = extractUserFromRequest(req);

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const licencee = searchParams.get('licencee');
    const effectiveLicencee =
      licencee && licencee.toLowerCase() !== 'all' ? licencee : undefined;
    const locationId = searchParams.get('locationId');
    const machineTypeFilter = searchParams.get('machineTypeFilter');
    const search = searchParams.get('search')?.trim();
    const onlineStatus = searchParams.get('onlineStatus');
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      logRouteError(
        functionName,
        'GET',
        '/api/cabinets/status',
        'Database connection failed',
        user
      );
      return NextResponse.json(
        {
          error: 'Database connection failed',
          totalMachines: 0,
          onlineMachines: 0,
          offlineMachines: 0,
          criticalOffline: 0,
          recentOffline: 0,
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Authenticate user and get accessible locations
    // ============================================================================
    // DEV MODE: Allow bypassing auth for testing

    let userRoles: string[] = [];
    let userLocationPermissions: string[] = [];
    let userAccessibleLicencees: string[] | 'all' = [];

    // Normal mode: Get user from JWT
    const userPayload = await getUserFromServer();
    userRoles = (userPayload?.roles as string[]) || [];
    // Use only new field
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }
    userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();

    // ============================================================================
    // STEP 4: Determine location filter based on user role and selected licencee
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicencees,
      effectiveLicencee,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 5: Query machines and calculate online/offline status with filters
    // ============================================================================

    // Build aggregation pipeline to join machines with locations for filtering
    const aggregationPipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        },
      },
      {
        $lookup: {
          from: 'gaminglocations',
          let: { locId: '$gamingLocation' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    { $toString: '$_id' },
                    { $ifNull: [{ $toString: '$$locId' }, ''] },
                  ],
                },
                $or: [
                  { deletedAt: null },
                  { deletedAt: { $lt: new Date('2025-01-01') } },
                ],
              },
            },
          ],
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
      // Exclude machines whose gaming location has been deleted or no longer exists
      { $match: { locationDetails: { $ne: null } } },
    ];

    // Apply search filter (Location Name or ID AND Machine fields)
    if (search) {
      const isObjectIdFormat = /^[0-9a-fA-F]{24}$/.test(search);
      const searchRegex = { $regex: search, $options: 'i' };
      const searchConditions: Record<string, unknown>[] = [
        { 'locationDetails.name': searchRegex },
        { serialNumber: searchRegex },
        { relayId: searchRegex },
        { smibBoard: searchRegex },
        { 'custom.name': searchRegex },
        { 'Custom.name': searchRegex },
      ];

      if (isObjectIdFormat) {
        searchConditions.push({ 'locationDetails._id': search });
        // Attempt to match machine _id if it's an ObjectId
        try {
          const { ObjectId } = require('mongodb');
          searchConditions.push({ _id: new ObjectId(search) });
        } catch {
          // ignore error
        }
      } else {
        searchConditions.push({ 'locationDetails._id': searchRegex });
      }

      aggregationPipeline.push({
        $match: {
          $or: searchConditions,
        },
      });
    }

    // Apply licencee filter if specified (filter by location's licencee)
    if (effectiveLicencee) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { 'locationDetails.rel.licencee': effectiveLicencee },
            { 'locationDetails.rel.licencee': effectiveLicencee },
          ],
        },
      });
    }

    if (locationId) {
      const locationIds = locationId.split(',').filter(id => id.trim() !== '');
      if (allowedLocationIds !== 'all') {
        if (!Array.isArray(allowedLocationIds)) {
          return NextResponse.json({
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
          });
        }
        const hasAccess = locationIds.every(id =>
          allowedLocationIds.includes(id)
        );
        if (!hasAccess)
          return NextResponse.json({
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
          });
      }
      if (locationIds.length > 0) {
        aggregationPipeline.push({
          $match: {
            gamingLocation:
              locationIds.length === 1 ? locationIds[0] : { $in: locationIds },
          },
        });
      }
    } else if (allowedLocationIds !== 'all') {
      if (
        !Array.isArray(allowedLocationIds) ||
        allowedLocationIds.length === 0
      ) {
        return NextResponse.json({
          totalMachines: 0,
          onlineMachines: 0,
          offlineMachines: 0,
        });
      }
      aggregationPipeline.push({
        $match: { gamingLocation: { $in: allowedLocationIds } },
      });
    }

    // Apply machine type filters
    if (machineTypeFilter) {
      const filters = machineTypeFilter.split(',').filter(f => f.trim() !== '');
      const filterConditions: Record<string, unknown>[] = [];
      filters.forEach(filter => {
        switch (filter.trim()) {
          case 'LocalServersOnly':
            filterConditions.push({ 'locationDetails.isLocalServer': true });
            break;
          case 'SMIBLocationsOnly':
            filterConditions.push({
              'locationDetails.noSMIBLocation': { $ne: true },
            });
            break;
          case 'NoSMIBLocation':
            filterConditions.push({ 'locationDetails.noSMIBLocation': true });
            break;
          case 'MembershipOnly':
            filterConditions.push({
              $or: [
                { 'locationDetails.membershipEnabled': true },
                { 'locationDetails.enableMembership': true },
              ],
            });
            break;
          case 'MissingCoordinates':
            filterConditions.push({
              $and: [
                {
                  $or: [
                    { 'locationDetails.googleMapsIframe': { $exists: false } },
                    { 'locationDetails.googleMapsIframe': null },
                    { 'locationDetails.googleMapsIframe': '' },
                  ],
                },
                {
                  $or: [
                    { 'locationDetails.googleMapsLink': { $exists: false } },
                    { 'locationDetails.googleMapsLink': null },
                    { 'locationDetails.googleMapsLink': '' },
                  ],
                },
                {
                  $and: [
                    {
                      $or: [
                        { 'locationDetails.geoCoords.latitude': { $exists: false } },
                        { 'locationDetails.geoCoords.latitude': null },
                        { 'locationDetails.geoCoords.latitude': { $in: [0, '0', '0.0', ''] } },
                        { 'locationDetails.geoCoords.latitude': { $type: 'string' } },
                      ],
                    },
                    {
                      $or: [
                        { 'locationDetails.geoCoords.longitude': { $exists: false } },
                        { 'locationDetails.geoCoords.longitude': null },
                        { 'locationDetails.geoCoords.longitude': { $in: [0, '0', '0.0', ''] } },
                        { 'locationDetails.geoCoords.longitude': { $type: 'string' } },
                      ],
                    },
                    {
                      $or: [
                        { 'locationDetails.geoCoords.longtitude': { $exists: false } },
                        { 'locationDetails.geoCoords.longtitude': null },
                        { 'locationDetails.geoCoords.longtitude': { $in: [0, '0', '0.0', ''] } },
                        { 'locationDetails.geoCoords.longtitude': { $type: 'string' } },
                      ],
                    },
                  ],
                },
              ],
            });
            break;
          case 'HasCoordinates':
            filterConditions.push({
              $or: [
                { 'locationDetails.googleMapsIframe': { $exists: true, $nin: [null, ''] } },
                { 'locationDetails.googleMapsLink': { $exists: true, $nin: [null, ''] } },
                { 'locationDetails.geoCoords.latitude': { $exists: true, $nin: [null, 0, '0', '0.0', ''], $not: { $type: 'string' } } },
                { 'locationDetails.geoCoords.longitude': { $exists: true, $nin: [null, 0, '0', '0.0', ''], $not: { $type: 'string' } } },
                { 'locationDetails.geoCoords.longtitude': { $exists: true, $nin: [null, 0, '0', '0.0', ''], $not: { $type: 'string' } } },
              ],
            });
            break;
        }
      });
      if (filterConditions.length > 0) {
        aggregationPipeline.push({ $match: { $or: filterConditions } });
      }
    }

    // Apply online/offline status filter
    if (onlineStatus && onlineStatus !== 'all') {
      if (onlineStatus === 'online') {
        aggregationPipeline.push({
          $match: {
            $or: [
              { 'locationDetails.aceEnabled': true },
              {
                $and: [
                  { lastActivity: { $exists: true, $ne: null } },
                  {
                    $expr: {
                      $gte: [
                        {
                          $convert: {
                            input: '$lastActivity',
                            to: 'date',
                            onError: new Date(0),
                          },
                        },
                        threeMinutesAgo,
                      ],
                    },
                  },
                ],
              },
            ],
          },
        });
      } else if (onlineStatus === 'offline') {
        aggregationPipeline.push({
          $match: {
            'locationDetails.aceEnabled': { $ne: true },
            $or: [
              { lastActivity: { $exists: false } },
              { lastActivity: null },
              {
                $expr: {
                  $lt: [
                    {
                      $convert: {
                        input: '$lastActivity',
                        to: 'date',
                        onError: new Date(0),
                      },
                    },
                    threeMinutesAgo,
                  ],
                },
              },
            ],
          },
        });
      } else if (
        onlineStatus === 'never-online' ||
        onlineStatus === 'neveronline'
      ) {
        aggregationPipeline.push({
          $match: {
            'locationDetails.aceEnabled': { $ne: true },
            $or: [{ lastActivity: { $exists: false } }, { lastActivity: null }],
          },
        });
      }
    }

    // Apply game type filter from query params
    const gameType = searchParams.get('gameType');
    if (gameType) {
      const types = gameType
        .split(',')
        .filter(t => t.trim() !== '' && t !== 'all');
      if (types.length > 0) {
        aggregationPipeline.push({
          $match: {
            $or: [{ game: { $in: types } }, { installedGame: { $in: types } }],
          },
        });
      }
    }

    const totalCountResult = await Machine.aggregate([
      ...aggregationPipeline,
      { $count: 'total' },
    ]).exec();
    const totalCount = totalCountResult[0]?.total || 0;

    // Get online machines count (lastActivity exists AND within last 3 minutes)
    // Machines without lastActivity are considered offline
    // Single result aggregation - use exec() for efficiency
    const onlineCountResult = await Machine.aggregate([
      ...aggregationPipeline,
      {
        $match: {
          $or: [
            { 'locationDetails.aceEnabled': true },
            {
              $and: [
                { lastActivity: { $exists: true, $ne: null } },
                {
                  $expr: {
                    $gte: [
                      {
                        $convert: {
                          input: '$lastActivity',
                          to: 'date',
                          onError: new Date(0),
                        },
                      },
                      threeMinutesAgo,
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
      { $count: 'total' },
    ]).exec();
    const onlineCount = onlineCountResult[0]?.total || 0;

    // Offline = total - online (includes machines without lastActivity)
    const offlineCount = totalCount - onlineCount;

    // Calculate critical offline (24+ hours) and recent offline (< 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Critical offline: machines offline for 24+ hours
    // (lastActivity exists AND is older than 24 hours, OR lastActivity doesn't exist)
    const criticalOfflineResult = await Machine.aggregate([
      ...aggregationPipeline,
      {
        $match: {
          'locationDetails.aceEnabled': { $ne: true },
          $or: [
            { lastActivity: { $exists: false } },
            { lastActivity: null },
            {
              $expr: {
                $lt: [
                  {
                    $convert: {
                      input: '$lastActivity',
                      to: 'date',
                      onError: new Date(0),
                    },
                  },
                  twentyFourHoursAgo,
                ],
              },
            },
          ],
        },
      },
      { $count: 'total' },
    ]).exec();
    const criticalOffline = criticalOfflineResult[0]?.total || 0;

    // Recent offline: machines offline for less than 4 hours
    // (lastActivity exists AND is between 3 minutes and 4 hours ago)
    const recentOfflineResult = await Machine.aggregate([
      ...aggregationPipeline,
      {
        $match: {
          'locationDetails.aceEnabled': { $ne: true },
          $and: [
            { lastActivity: { $exists: true, $ne: null } },
            {
              $expr: {
                $and: [
                  {
                    $gte: [
                      {
                        $convert: {
                          input: '$lastActivity',
                          to: 'date',
                          onError: new Date(0),
                        },
                      },
                      fourHoursAgo,
                    ],
                  },
                  {
                    $lt: [
                      {
                        $convert: {
                          input: '$lastActivity',
                          to: 'date',
                          onError: new Date(0),
                        },
                      },
                      threeMinutesAgo,
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
      { $count: 'total' },
    ]).exec();
    const recentOffline = recentOfflineResult[0]?.total || 0;

    // Calculate location-level stats
    const locationStatusResult = await Machine.aggregate([
      ...aggregationPipeline,
      {
        $group: {
          _id: '$gamingLocation',
          isOnline: {
            $max: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$locationDetails.aceEnabled', true] },
                    {
                      $and: [
                        { $gt: ['$lastActivity', null] },
                        {
                          $gte: [
                            {
                              $convert: {
                                input: '$lastActivity',
                                to: 'date',
                                onError: new Date(0),
                              },
                            },
                            threeMinutesAgo,
                          ],
                        },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalLocations: { $sum: 1 },
          onlineLocations: { $sum: '$isOnline' },
        },
      },
    ]).exec();

    // Query GamingLocations directly so totalLocations matches the dashboard count
    // (machine aggregation only sees locations that have machines; this includes empty ones)
    const locationCountFilter: Array<Record<string, unknown>> = [
      {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      },
    ];

    if (search) {
      locationCountFilter.push({ name: { $regex: search, $options: 'i' } });
    }

    if (effectiveLicencee) {
      locationCountFilter.push({ 'rel.licencee': effectiveLicencee });
    }

    if (locationId) {
      const specificIds = locationId.split(',').filter(id => id.trim() !== '');
      if (specificIds.length > 0) {
        locationCountFilter.push({ _id: { $in: specificIds } });
      }
    } else if (allowedLocationIds !== 'all' && Array.isArray(allowedLocationIds)) {
      locationCountFilter.push({ _id: { $in: allowedLocationIds } });
    }

    if (machineTypeFilter) {
      const typeFilters = machineTypeFilter.split(',').filter(f => f.trim() !== '');
      typeFilters.forEach(filter => {
        switch (filter.trim()) {
          case 'LocalServersOnly':
            locationCountFilter.push({ isLocalServer: true });
            break;
          case 'SMIBLocationsOnly':
            locationCountFilter.push({ noSMIBLocation: { $ne: true } });
            break;
          case 'NoSMIBLocation':
            locationCountFilter.push({ noSMIBLocation: true });
            break;
          case 'MembershipOnly':
            locationCountFilter.push({
              $or: [{ membershipEnabled: true }, { enableMembership: true }],
            });
            break;
          case 'MissingCoordinates':
            locationCountFilter.push({
              $and: [
                {
                  $or: [
                    { googleMapsIframe: { $exists: false } },
                    { googleMapsIframe: null },
                    { googleMapsIframe: '' },
                  ],
                },
                {
                  $or: [
                    { googleMapsLink: { $exists: false } },
                    { googleMapsLink: null },
                    { googleMapsLink: '' },
                  ],
                },
                {
                  $and: [
                    {
                      $or: [
                        { 'geoCoords.latitude': { $exists: false } },
                        { 'geoCoords.latitude': null },
                        { 'geoCoords.latitude': { $in: [0, '0', '0.0', ''] } },
                        { 'geoCoords.latitude': { $type: 'string' } },
                      ],
                    },
                    {
                      $or: [
                        { 'geoCoords.longitude': { $exists: false } },
                        { 'geoCoords.longitude': null },
                        { 'geoCoords.longitude': { $in: [0, '0', '0.0', ''] } },
                        { 'geoCoords.longitude': { $type: 'string' } },
                      ],
                    },
                    {
                      $or: [
                        { 'geoCoords.longtitude': { $exists: false } },
                        { 'geoCoords.longtitude': null },
                        { 'geoCoords.longtitude': { $in: [0, '0', '0.0', ''] } },
                        { 'geoCoords.longtitude': { $type: 'string' } },
                      ],
                    },
                  ],
                },
              ],
            });
            break;
          case 'HasCoordinates':
            locationCountFilter.push({
              $or: [
                { googleMapsIframe: { $exists: true, $nin: [null, ''] } },
                { googleMapsLink: { $exists: true, $nin: [null, ''] } },
                { 'geoCoords.latitude': { $exists: true, $nin: [null, 0, '0', '0.0', ''], $not: { $type: 'string' } } },
                { 'geoCoords.longitude': { $exists: true, $nin: [null, 0, '0', '0.0', ''], $not: { $type: 'string' } } },
                { 'geoCoords.longtitude': { $exists: true, $nin: [null, 0, '0', '0.0', ''], $not: { $type: 'string' } } },
              ],
            });
            break;
        }
      });
    }

    const totalLocations = await GamingLocations.countDocuments({
      $and: locationCountFilter,
    });
    const onlineLocations = locationStatusResult[0]?.onlineLocations || 0;
    const offlineLocations = Math.max(0, totalLocations - onlineLocations);

    // ============================================================================
    // STEP 6: Return machine status counts
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/cabinets/status',
      totalCount,
      user,
      duration
    );
    return NextResponse.json({
      totalMachines: totalCount,
      onlineMachines: onlineCount,
      offlineMachines: offlineCount,
      criticalOffline,
      recentOffline,
      totalLocations,
      onlineLocations,
      offlineLocations,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    logRouteError(
      functionName,
      'GET',
      '/api/cabinets/status',
      errorMessage,
      user
    );
    console.error(
      `[Machine Status API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        error: errorMessage,
        totalMachines: 0,
        onlineMachines: 0,
        offlineMachines: 0,
        criticalOffline: 0,
        recentOffline: 0,
      },
      { status: 500 }
    );
  }
}
