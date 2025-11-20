import { calculateChanges } from '@/app/api/lib/helpers/activityLogger';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import { formatIPForDisplay, getIPInfo } from '@/lib/utils/ipDetection';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../lib/helpers/users';
import { connectDB } from '../lib/middleware/db';
import { GamingLocations } from '../lib/models/gaminglocations';
import { Machine } from '../lib/models/machines';
import User from '../lib/models/user';

import { generateMongoId } from '@/lib/utils/id';

/**
 * GET /api/activity-logs
 * Get activity logs with filtering, searching, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Ensure ActivityLog model is available
    if (!ActivityLog) {
      console.error('ActivityLog model is not available');
      return NextResponse.json(
        { success: false, error: 'ActivityLog model not available' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Filter parameters
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');
    const email = searchParams.get('email');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const resourceId = searchParams.get('resourceId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Sort parameters
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query filter
    const filter: Record<string, unknown> = {};

    if (userId) {
      filter.userId = userId;
    }

    if (username) {
      filter.username = { $regex: username, $options: 'i' };
    }

    if (email) {
      // More explicit email search - ensure it's searching the right field
      filter['actor.email'] = { $regex: email, $options: 'i' };
    }

    if (action) {
      filter.action = action;
    }

    if (resource) {
      filter.resource = resource;
    }

    if (resourceId) {
      filter.resourceId = resourceId;
    }

    if (startDate || endDate) {
      filter.timestamp = {} as Record<string, Date>;
      if (startDate) {
        (filter.timestamp as Record<string, Date>).$gte = new Date(startDate);
        console.warn('Activity logs start date filter:', new Date(startDate));
      }
      if (endDate) {
        (filter.timestamp as Record<string, Date>).$lte = new Date(endDate);
        console.warn('Activity logs end date filter:', new Date(endDate));
      }
    }

    // Global search across multiple fields (only if no specific filters are applied)
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

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Apply role-based filtering
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const currentUserLicensees =
      (currentUser?.rel as { licencee?: string[] })?.licencee || [];
    const currentUserLocationPermissions = 
      ((currentUser?.resourcePermissions as { 'gaming-locations'?: { resources?: string[] } })?.['gaming-locations']?.resources || [])
      .map(id => String(id));

    const isAdmin =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer');
    const isManager = currentUserRoles.includes('manager') && !isAdmin;
    const isLocationAdmin = currentUserRoles.includes('location admin') && !isAdmin && !isManager;

    // If manager (not admin), filter activity logs to only their licensees' resources
    if (isManager && !isAdmin && currentUserLicensees.length > 0) {
      // Get all resource IDs that belong to manager's licensees
      const [locations, machines, users] = await Promise.all([
        GamingLocations.find({ 'rel.licencee': { $in: currentUserLicensees } })
          .select('_id')
          .lean(),
        Machine.find({}).select('_id gamingLocation').lean(), // Get all machines, will filter by location
        User.find({ 'rel.licencee': { $in: currentUserLicensees } })
          .select('_id')
          .lean(),
      ]);

      const locationIds = locations.map(l => String(l._id));

      // Filter machines to only those in manager's locations
      const machineLocationIds = new Set(locationIds);
      const managerMachines = machines.filter(m =>
        machineLocationIds.has(String(m.gamingLocation))
      );
      const machineIds = managerMachines.map(m => String(m._id));

      const userIds = users.map(u => String(u._id));

      // Activity log must be related to one of manager's resources
      filter.$or = [
        // Activities on locations
        { resource: 'location', resourceId: { $in: locationIds } },
        // Activities on machines
        { resource: 'machine', resourceId: { $in: machineIds } },
        { resource: 'cabinet', resourceId: { $in: machineIds } },
        // Activities on users
        { resource: 'user', resourceId: { $in: userIds } },
        // Activities by users in manager's licensees
        { userId: { $in: userIds } },
      ];

      console.warn('[ACTIVITY LOGS] Manager filter applied:', {
        managerLicensees: currentUserLicensees,
        locationCount: locationIds.length,
        machineCount: machineIds.length,
        userCount: userIds.length,
      });
    } else if (isLocationAdmin && currentUserLocationPermissions.length > 0) {
      // Location admins can only see activity logs related to their assigned locations
      // Get all machines in location admin's assigned locations
      const machines = await Machine.find({
        gamingLocation: { $in: currentUserLocationPermissions },
      })
        .select('_id')
        .lean();
      const machineIds = machines.map(m => String(m._id));

      // Get all users who have access to at least one of the location admin's assigned locations
      const users = await User.find({
        'resourcePermissions.gaming-locations.resources': {
          $in: currentUserLocationPermissions,
        },
      })
        .select('_id')
        .lean();
      const userIds = users.map(u => String(u._id));

      // Activity log must be related to one of location admin's resources
      filter.$or = [
        // Activities on locations
        { resource: 'location', resourceId: { $in: currentUserLocationPermissions } },
        // Activities on machines in assigned locations
        { resource: 'machine', resourceId: { $in: machineIds } },
        { resource: 'cabinet', resourceId: { $in: machineIds } },
        // Activities on users with access to assigned locations
        { resource: 'user', resourceId: { $in: userIds } },
        // Activities by users with access to assigned locations
        { userId: { $in: userIds } },
      ];

      console.warn('[ACTIVITY LOGS] Location Admin filter applied:', {
        locationAdminLocations: currentUserLocationPermissions,
        locationCount: currentUserLocationPermissions.length,
        machineCount: machineIds.length,
        userCount: userIds.length,
      });
    }

    console.warn(
      'Activity logs query filter:',
      JSON.stringify(filter, null, 2)
    );

    // Execute query with pagination
    const [logs, totalCount] = await Promise.all([
      ActivityLog.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        activities: logs,
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
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activity-logs
 * Create a new activity log entry
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    const { action, resource, resourceId, userId, username, userRole } = body;

    if (!action || !resource || !resourceId || !userId || !username) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate changes if previousData and newData are provided
    let changes = body.changes || [];
    if (body.previousData && body.newData) {
      changes = calculateChanges(body.previousData, body.newData);
    }

    // Get client IP information
    const ipInfo = getIPInfo(request);
    const formattedIP = formatIPForDisplay(ipInfo);

    // Generate a proper MongoDB ObjectId-style hex string for the activity log
    const activityLogId = await generateMongoId();

    // Create new activity log
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

    return NextResponse.json({
      success: true,
      data: { activityLog },
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity log' },
      { status: 500 }
    );
  }
}
