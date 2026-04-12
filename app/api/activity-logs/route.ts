/**
 * Activity Logs API Route
 *
 * This route handles activity log management including fetching and creating activity logs.
 *
 * @module app/api/activity-logs/route
 */

import { calculateChanges } from '@/app/api/lib/helpers/activityLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import User from '@/app/api/lib/models/user';
import { generateMongoId } from '@/lib/utils/id';
import { formatIPForDisplay, getIPInfo } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching activity logs
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser, userRoles, isAdminOrDev }) => {
    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Filters
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
    if (membershipLog !== null) filter.membershipLog = membershipLog === 'true';

    if (startDate || endDate) {
      filter.timestamp = {} as Record<string, Date>;
      if (startDate) (filter.timestamp as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) (filter.timestamp as Record<string, Date>).$lte = new Date(endDate);
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
      ];
    }

    // Role-based filtering
    const isManager = userRoles.includes('manager') && !isAdminOrDev;
    const isLocationAdmin = userRoles.includes('location admin') && !isAdminOrDev && !isManager;

    const userWithEntities = currentUser as { assignedLicencees?: string[]; assignedLocations?: string[] };

    if (isManager && (userWithEntities.assignedLicencees?.length ?? 0) > 0) {
      const currentUserLicencees = userWithEntities.assignedLicencees;
      const [locations, machines, users] = await Promise.all([
        GamingLocations.find({ 'rel.licencee': { $in: currentUserLicencees } }).select('_id').lean(),
        Machine.find({}).select('_id gamingLocation').lean(),
        User.find({ assignedLicencees: { $in: currentUserLicencees } }).select('_id').lean(),
      ]);

      const locationIds = locations.map(l => String(l._id));
      const machineLocationIds = new Set(locationIds);
      const machineIds = machines.filter(m => machineLocationIds.has(String(m.gamingLocation))).map(m => String(m._id));
      const userIds = users.map(u => String(u._id));

      filter.$or = [
        { resource: 'location', resourceId: { $in: locationIds } },
        { resource: 'machine', resourceId: { $in: machineIds } },
        { resource: 'cabinet', resourceId: { $in: machineIds } },
        { resource: 'user', resourceId: { $in: userIds } },
        { userId: { $in: userIds } },
      ];
    } else if (isLocationAdmin && (userWithEntities.assignedLocations?.length ?? 0) > 0) {
      const currentUserLocations = userWithEntities.assignedLocations?.map((id: string) => String(id)) ?? [];
      const machines = await Machine.find({ gamingLocation: { $in: currentUserLocations } }).select('_id').lean();
      const machineIds = machines.map(m => String(m._id));
      const users = await User.find({ assignedLocations: { $in: currentUserLocations } }).select('_id').lean();
      const userIds = users.map(u => String(u._id));

      filter.$or = [
        { resource: 'location', resourceId: { $in: currentUserLocations } },
        { resource: 'machine', resourceId: { $in: machineIds } },
        { resource: 'cabinet', resourceId: { $in: machineIds } },
        { resource: 'user', resourceId: { $in: userIds } },
        { userId: { $in: userIds } },
      ];
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
    let logs, totalCount;
    if (search && !username && !email && !resourceId) {
      const searchLower = search.toLowerCase().trim();
      const pipeline = [
        { $match: filter },
        {
          $addFields: {
            relevance: {
              $add: [
                { $cond: [{ $regexMatch: { input: "$username", regex: `^${searchLower}`, options: "i" } }, 20, 0] },
                { $cond: [{ $regexMatch: { input: "$actor.email", regex: `^${searchLower}`, options: "i" } }, 15, 0] },
                { $cond: [{ $regexMatch: { input: { $toString: "$_id" }, regex: `^${searchLower}`, options: "i" } }, 10, 0] },
                { $cond: [{ $regexMatch: { input: "$description", regex: `^${searchLower}`, options: "i" } }, 5, 0] }
              ]
            }
          }
        },
        { $sort: { relevance: -1, timestamp: -1 } as Record<string, 1 | -1> },
        { $skip: skip },
        { $limit: limit }
      ];
      [logs, totalCount] = await Promise.all([ActivityLog.aggregate(pipeline), ActivityLog.countDocuments(filter)]);
    } else {
      [logs, totalCount] = await Promise.all([
        ActivityLog.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        ActivityLog.countDocuments(filter),
      ]);
    }

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
  });
}

/**
 * Main POST handler for creating activity log entry
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async () => {
    const body = await request.json();
    const { action, resource, resourceId, userId, username, userRole } = body;

    if (!action || !resource || !resourceId || !userId || !username) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let changes = body.changes || [];
    if (body.previousData && body.newData) {
      changes = calculateChanges(body.previousData, body.newData);
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
      actor: body.actor || { id: userId, email: username, role: userRole || 'user' },
      ipAddress: formattedIP,
      userAgent: ipInfo.userAgent,
      changes: changes,
      previousData: body.previousData,
      newData: body.newData,
    });

    await activityLog.save();
    return NextResponse.json({ success: true, data: { activityLog } });
  });
}
