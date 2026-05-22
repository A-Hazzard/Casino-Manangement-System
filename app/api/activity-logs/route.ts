/**
 * Activity Logs API Route
 *
 * This route handles activity log management including fetching and creating activity logs.
 *
 * @module app/api/activity-logs/route
 */

import {
  calculateChanges,
  mapDeletedFieldsToChanges,
} from '@/app/api/lib/helpers/activityLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import User from '@/app/api/lib/models/user';
import { generateMongoId } from '@/lib/utils/id';
import { formatIPForDisplay, getIPInfo } from '@/lib/utils/ipAddress';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type {
  ActivityLogDocument,
  GamingLocationDocument,
  GamingMachine,
} from '@/shared/types';
import type { LeanUserDocument } from '@/shared/types/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/activity-logs
 *
 * Returns a paginated, filtered list of activity log entries. Managers and
 * location admins receive results scoped to their accessible resources; admins
 * and developers see all logs. When `search` is provided without conflicting
 * filters the results are ranked by relevance.
 *
 * Query params:
 * @param {number} [page] - Optional. Page number for pagination (default 1).
 * @param {number} [limit] - Optional. Records per page (default 50).
 * @param {string} [userId] - Optional. Filter by the acting user's ID.
 * @param {string} [username] - Optional. Case-insensitive regex match on username.
 * @param {string} [email] - Optional. Case-insensitive regex match on actor.email.
 * @param {string} [action] - Optional. Exact match on action type (e.g. 'CREATE', 'UPDATE').
 * @param {string} [resource] - Optional. Filter by resource type (e.g. 'machine', 'user').
 * @param {string} [resourceId] - Optional. Filter by the ID of the affected resource.
 * @param {string} [membershipLog] - Optional. 'true' or 'false' — filter membership-related logs.
 * @param {string} [startDate] - Optional. ISO date string; include logs at or after this timestamp.
 * @param {string} [endDate] - Optional. ISO date string; include logs at or before this timestamp.
 * @param {string} [search] - Optional. Full-text search across username, email, resourceName, details, description, and IDs.
 * @param {string} [sortBy] - Optional. Field to sort by (default 'timestamp').
 * @param {string} [sortOrder] - Optional. 'asc' or 'desc' (default 'desc').
 */
export async function GET(request: NextRequest) {
  const functionName = 'GET /api/activity-logs';
  const user = extractUserFromRequest(request);

  return withApiAuth(
    request,
    async ({ user: currentUser, userRoles, isAdminOrDev }) => {
      const startTime = Date.now();
      const { searchParams } = new URL(request.url);

      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      const userId = searchParams.get('userId');
      const username = searchParams.get('username');
      const email = searchParams.get('email');
      const action = searchParams.get('action');
      const resource = searchParams.get('resource');
      const resourceId = searchParams.get('resourceId');
      const membershipLog = searchParams.get('membershipLog');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const search = searchParams.get('search');

      const sortBy = searchParams.get('sortBy') || 'timestamp';
      const sortOrder = searchParams.get('sortOrder') || 'desc';

      const filter: Record<string, unknown> = { deletedAt: { $exists: false } };
      if (userId) filter.userId = userId;
      if (username) filter.username = { $regex: username, $options: 'i' };
      if (email) filter['actor.email'] = { $regex: email, $options: 'i' };
      if (action) filter.action = action;
      if (resource) filter.resource = resource;
      if (resourceId) filter.resourceId = resourceId;
      if (membershipLog !== null)
        filter.membershipLog = membershipLog === 'true';

      if (startDate || endDate) {
        filter.timestamp = {} as Record<string, Date>;
        if (startDate)
          (filter.timestamp as Record<string, Date>).$gte = new Date(startDate);
        if (endDate)
          (filter.timestamp as Record<string, Date>).$lte = new Date(endDate);
      }

      if (search && !username && !email && !resourceId) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { 'actor.email': { $regex: search, $options: 'i' } },
          { resourceName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { details: { $regex: search, $options: 'i' } },
          { _id: { $regex: search, $options: 'i' } },
          { resourceId: { $regex: search, $options: 'i' } },
          { userId: { $regex: search, $options: 'i' } },
          { ipAddress: { $regex: search, $options: 'i' } },
        ];
      }

      const isManager = userRoles.includes('manager') && !isAdminOrDev;
      const isLocationAdmin =
        userRoles.includes('location admin') && !isAdminOrDev && !isManager;

      const userWithEntities = currentUser as {
        assignedLicencees?: string[];
        assignedLocations?: string[];
      };

      if (isManager && (userWithEntities.assignedLicencees?.length ?? 0) > 0) {
        const currentUserLicencees = userWithEntities.assignedLicencees;
        const [locations, machines, users] = await Promise.all([
          GamingLocations.find({
            'rel.licencee': { $in: currentUserLicencees },
          })
            .select('_id')
            .lean<GamingLocationDocument[]>(),
          Machine.find({}).select('_id gamingLocation').lean<GamingMachine[]>(),
          User.find({ assignedLicencees: { $in: currentUserLicencees } })
            .select('_id')
            .lean<LeanUserDocument[]>(),
        ]);

        const locationIds = locations.map(l => String(l._id));
        const machineLocationIds = new Set(locationIds);
        const machineIds = machines
          .filter(m => machineLocationIds.has(String(m.gamingLocation)))
          .map(m => String(m._id));
        const userIds = users.map(u => String(u._id));

        filter.$or = [
          { resource: 'location', resourceId: { $in: locationIds } },
          { resource: 'machine', resourceId: { $in: machineIds } },
          { resource: 'cabinet', resourceId: { $in: machineIds } },
          { resource: 'user', resourceId: { $in: userIds } },
          { userId: { $in: userIds } },
        ];
      } else if (
        isLocationAdmin &&
        (userWithEntities.assignedLocations?.length ?? 0) > 0
      ) {
        const currentUserLocations =
          userWithEntities.assignedLocations?.map((id: string) => String(id)) ??
          [];
        const machines = await Machine.find({
          gamingLocation: { $in: currentUserLocations },
        })
          .select('_id')
          .lean<GamingMachine[]>();
        const machineIds = machines.map(m => String(m._id));
        const users = await User.find({
          assignedLocations: { $in: currentUserLocations },
        })
          .select('_id')
          .lean<LeanUserDocument[]>();
        const userIds = users.map(u => String(u._id));

        filter.$or = [
          { resource: 'location', resourceId: { $in: currentUserLocations } },
          { resource: 'machine', resourceId: { $in: machineIds } },
          { resource: 'cabinet', resourceId: { $in: machineIds } },
          { resource: 'user', resourceId: { $in: userIds } },
          { userId: { $in: userIds } },
        ];
      }

      const sort: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === 'asc' ? 1 : -1,
      };

      let logs, totalCount;
      if (search && !username && !email && !resourceId) {
        const searchLower = search.toLowerCase().trim();
        const pipeline = [
          { $match: filter },
          {
            $addFields: {
              relevance: {
                $add: [
                  {
                    $cond: [
                      {
                        $regexMatch: {
                          input: '$username',
                          regex: `^${searchLower}`,
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
                          input: '$actor.email',
                          regex: `^${searchLower}`,
                          options: 'i',
                        },
                      },
                      15,
                      0,
                    ],
                  },
                  {
                    $cond: [
                      {
                        $regexMatch: {
                          input: { $toString: '$_id' },
                          regex: `^${searchLower}`,
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
                          input: '$description',
                          regex: `^${searchLower}`,
                          options: 'i',
                        },
                      },
                      5,
                      0,
                    ],
                  },
                  {
                    $cond: [
                      {
                        $regexMatch: {
                          input: '$ipAddress',
                          regex: `^${searchLower}`,
                          options: 'i',
                        },
                      },
                      5,
                      0,
                    ],
                  },
                ],
              },
            },
          },
          { $sort: { relevance: -1, timestamp: -1 } as Record<string, 1 | -1> },
          { $skip: skip },
          { $limit: limit },
        ];
        [logs, totalCount] = await Promise.all([
          ActivityLog.aggregate(pipeline),
          ActivityLog.countDocuments(filter),
        ]);
      } else {
        [logs, totalCount] = await Promise.all([
          ActivityLog.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean<ActivityLogDocument[]>(),
          ActivityLog.countDocuments(filter),
        ]);
      }

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/activity-logs',
        logs.length,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        data: {
          activities: logs,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit,
          },
        },
      });
    }
  );
}

/**
 * POST /api/activity-logs
 *
 * Creates a new activity log entry. Called internally by server actions and
 * API routes after performing auditable operations.
 *
 * Body fields:
 * @param {string} action - Required. The action performed (e.g. 'CREATE', 'UPDATE', 'DELETE').
 * @param {string} resource - Required. The resource type affected (e.g. 'machine', 'user').
 * @param {string} resourceId - Required. The ID of the affected resource.
 * @param {string} userId - Required. ID of the user performing the action.
 * @param {string} username - Required. Username (or email) of the actor.
 * @param {string} [userRole] - Optional. Role of the acting user, stored in actor.role.
 * @param {string} [resourceName] - Optional. Human-readable name of the affected resource.
 * @param {string} [details] - Optional. Free-text description of what changed.
 * @param {string} [description] - Optional. Short summary line for display.
 * @param {object} [actor] - Optional. Full actor object `{ id, email, role }` — overrides derived actor.
 * @param {Array} [changes] - Optional. Explicit list of `{ field, oldValue, newValue }` change records.
 * @param {object} [previousData] - Optional. Full document state before the change (auto-diffs with newData if both provided).
 * @param {object} [newData] - Optional. Full document state after the change (auto-diffs with previousData if both provided).
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/activity-logs';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    const body = await request.json();
    const { action, resource, resourceId, userId, username, userRole } = body;

    if (!action || !resource || !resourceId || !userId || !username) {
      logRouteError(
        functionName,
        'POST',
        '/api/activity-logs',
        'Missing required fields',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let changes = body.changes || [];
    if (body.previousData && body.newData) {
      changes = calculateChanges(body.previousData, body.newData);
    } else if (body.newData) {
      changes = calculateChanges({}, body.newData);
    } else if (body.previousData) {
      changes = mapDeletedFieldsToChanges(body.previousData);
    }

    const ipInfo = getIPInfo(request);
    const formattedIP = formatIPForDisplay(ipInfo);
    const activityLogId = await generateMongoId();

    const activityLog = new ActivityLog({
      _id: activityLogId,
      timestamp: new Date(),
      userId,
      username,
      action,
      resource,
      resourceId,
      resourceName: body.resourceName,
      details: body.details,
      description: body.description,
      actor: body.actor || {
        id: userId,
        email: username,
        role: userRole || 'user',
      },
      ipAddress: formattedIP,
      userAgent: ipInfo.userAgent,
      changes: changes,
      previousData: body.previousData,
      newData: body.newData,
    });

    await activityLog.save();

    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/activity-logs',
      1,
      user,
      duration
    );

    return NextResponse.json({ success: true, data: { activityLog } });
  });
}

/**
 * DELETE /api/activity-logs
 *
 * Deletes all activity logs from the database. Restricted to developers only.
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const functionName = 'DELETE /api/activity-logs';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ userRoles }) => {
    const isDeveloper = userRoles.some(
      role => role.toLowerCase() === 'developer'
    );
    if (!isDeveloper) {
      logRouteError(
        functionName,
        'DELETE',
        '/api/activity-logs',
        'Forbidden - developer role required',
        user
      );
      return NextResponse.json(
        {
          success: false,
          message: 'Forbidden: Only developers can clear activity logs',
        },
        { status: 403 }
      );
    }

    const deleteResult = await ActivityLog.deleteMany({});

    const duration = Date.now() - startTime;
    logRouteDelete(
      functionName,
      'DELETE',
      '/api/activity-logs',
      deleteResult.deletedCount || 0,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      message: `Successfully cleared all activity logs (${deleteResult.deletedCount} entries).`,
    });
  });
}
