/**
 * Machine Status API Route
 *
 * This route handles fetching machine online/offline status based on lastActivity.
 * It supports:
 * - Filtering by licensee
 * - Role-based location filtering
 * - Online/offline counts based on lastActivity (3 minute threshold)
 * - Admin/Developer: all machines for selected licensee
 * - Other roles: only machines for assigned locations
 *
 * @module app/api/machines/status/route
 */

import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { Document } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching machine status
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Authenticate user and get accessible locations
 * 4. Determine location filter based on user role and selected licensee
 * 5. Query machines with lastActivity and calculate online/offline status
 * 6. Return machine status counts
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const licensee =
      searchParams.get('licensee') || searchParams.get('licencee');
    const effectiveLicensee =
      licensee && licensee.toLowerCase() !== 'all' ? licensee : undefined;
    const locationId = searchParams.get('locationId');
    const machineTypeFilter = searchParams.get('machineTypeFilter');

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        {
          error: 'Database connection failed',
          totalMachines: 0,
          onlineMachines: 0,
          offlineMachines: 0,
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Authenticate user and get accessible locations
    // ============================================================================
    // DEV MODE: Allow bypassing auth for testing
    const isDevMode = process.env.NODE_ENV === 'development';
    const testUserId = searchParams.get('testUserId');

    let userRoles: string[] = [];
    let userLocationPermissions: string[] = [];
    let userAccessibleLicensees: string[] | 'all' = [];

    if (isDevMode && testUserId) {
      // Dev mode: Get user directly from DB for testing
      const UserModel = (await import('../../lib/models/user')).default;
      const testUserResult = await UserModel.findOne({
        _id: testUserId,
      }).lean();
      if (testUserResult && !Array.isArray(testUserResult)) {
        const testUser = testUserResult as {
          roles?: string[];
          assignedLocations?: string[];
          assignedLicensees?: string[];
        };
        userRoles = (testUser.roles || []) as string[];
        userLocationPermissions = Array.isArray(testUser.assignedLocations)
          ? testUser.assignedLocations.map((id: string) => String(id))
          : [];
        userAccessibleLicensees = Array.isArray(testUser.assignedLicensees)
          ? testUser.assignedLicensees
          : [];
      } else {
        return NextResponse.json(
          { error: 'Test user not found' },
          { status: 404 }
        );
      }
    } else {
      // Normal mode: Get user from JWT
      const userPayload = await getUserFromServer();
      if (!userPayload && !isDevMode) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userRoles = (userPayload?.roles as string[]) || [];
      // Use only new field
      if (
        Array.isArray(
          (userPayload as { assignedLocations?: string[] })?.assignedLocations
        )
      ) {
        userLocationPermissions = (
          userPayload as { assignedLocations: string[] }
        ).assignedLocations;
      }
      userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    }

    // ============================================================================
    // STEP 4: Determine location filter based on user role and selected licensee
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      effectiveLicensee,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 5: Query machines and calculate online/offline status with filters
    // ============================================================================
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // Build aggregation pipeline to join machines with locations for filtering
    const aggregationPipeline: Document[] = [
      {
        $match: {
          deletedAt: { $in: [null, new Date(-1)] },
        },
      },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'gamingLocation',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
    ];

    // Apply location access filter
    if (locationId) {
      // Validate that user has access to this location
      if (allowedLocationIds !== 'all') {
        if (
          !Array.isArray(allowedLocationIds) ||
          !allowedLocationIds.includes(locationId)
        ) {
          // User doesn't have access to this location
          return NextResponse.json({
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
          });
        }
      }
      aggregationPipeline.push({
        $match: { gamingLocation: locationId },
      });
    } else if (allowedLocationIds !== 'all') {
      // No specific location, filter by user's accessible locations
      if (
        !Array.isArray(allowedLocationIds) ||
        allowedLocationIds.length === 0
      ) {
        // No accessible locations
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

    // Apply machine type filters (SMIB, No SMIB, Local Server, Membership)
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
              'locationDetails.membershipEnabled': true,
            });
            break;
        }
      });

      // Apply OR logic - location must match ANY of the selected filters
      // This allows users to see locations that match any combination of filters
      if (filterConditions.length > 0) {
        aggregationPipeline.push({ $match: { $or: filterConditions } });
      }
    }

    // Get total machines count (ALL machines, including those without lastActivity)
    const totalCountResult = await db
      .collection('machines')
      .aggregate([...aggregationPipeline, { $count: 'total' }])
      .toArray();
    const totalCount = totalCountResult[0]?.total || 0;

    // Get online machines count (lastActivity exists AND within last 3 minutes)
    // Machines without lastActivity are considered offline
    const onlineCountResult = await db
      .collection('machines')
      .aggregate([
        ...aggregationPipeline,
        {
          $match: {
            lastActivity: {
              $exists: true,
              $gte: threeMinutesAgo,
            },
          },
        },
        { $count: 'total' },
      ])
      .toArray();
    const onlineCount = onlineCountResult[0]?.total || 0;

    // Offline = total - online (includes machines without lastActivity)
    const offlineCount = totalCount - onlineCount;

    // ============================================================================
    // STEP 6: Return machine status counts
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(
        `[Machine Status API] Completed in ${duration}ms for ${totalCount} machines`
      );
    }

    return NextResponse.json({
      totalMachines: totalCount,
      onlineMachines: onlineCount,
      offlineMachines: offlineCount,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
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
      },
      { status: 500 }
    );
  }
}
