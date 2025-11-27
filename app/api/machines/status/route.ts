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
      console.warn('[Machine Status API] 🔧 DEV MODE: Using testUserId:', testUserId);
      const UserModel = (await import('../../lib/models/user')).default;
      const testUserResult = await UserModel.findOne({ _id: testUserId }).lean();
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
        console.log('[Machine Status API] DEV MODE - User from DB:', {
          roles: userRoles,
          assignedLocations: userLocationPermissions,
          assignedLicensees: userAccessibleLicensees,
        });
      } else {
        return NextResponse.json({ error: 'Test user not found' }, { status: 404 });
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
        userLocationPermissions = (userPayload as { assignedLocations: string[] })
          .assignedLocations;
      }
      userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    }

    // ============================================================================
    // STEP 4: Determine location filter based on user role and selected licensee
    // ============================================================================
    console.log('[Machine Status API] User roles:', userRoles);
    console.log('[Machine Status API] User assignedLocations:', userLocationPermissions);
    console.log('[Machine Status API] User accessibleLicensees:', userAccessibleLicensees);
    console.log('[Machine Status API] Effective licensee:', effectiveLicensee);
    
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      effectiveLicensee,
      userLocationPermissions,
      userRoles
    );
    
    console.log(
      '[Machine Status API] Allowed location IDs:',
      allowedLocationIds === 'all'
        ? 'all (no filtering)'
        : `${Array.isArray(allowedLocationIds) ? allowedLocationIds.length : 0} locations`
    );
    if (Array.isArray(allowedLocationIds) && allowedLocationIds.length > 0) {
      console.log('[Machine Status API] Allowed location IDs list:', allowedLocationIds.slice(0, 10));
    }

    // ============================================================================
    // STEP 5: Query machines and calculate online/offline status
    // ============================================================================
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // Build match stage for machines (include ALL machines, not just those with lastActivity)
    const machineMatchStage: Record<string, unknown> = {
      deletedAt: { $in: [null, new Date(-1)] },
      // NOTE: We don't filter by lastActivity here - we want to count ALL machines
      // Machines without lastActivity will be counted as offline
    };

    // If specific locationId is provided, use it (after validating access)
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
      machineMatchStage.gamingLocation = locationId;
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
      machineMatchStage.gamingLocation = { $in: allowedLocationIds };
    }

    // Get total machines count (ALL machines, including those without lastActivity)
    const totalCount = await db
      .collection('machines')
      .countDocuments(machineMatchStage);

    // Get online machines count (lastActivity exists AND within last 3 minutes)
    // Machines without lastActivity are considered offline
    const onlineMatchStage = {
      ...machineMatchStage,
      lastActivity: {
        $exists: true,
        $gte: threeMinutesAgo,
      },
    };

    const onlineCount = await db
      .collection('machines')
      .countDocuments(onlineMatchStage);

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
