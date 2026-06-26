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
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import {
  createBasePipeline,
  addSearchFilter,
  addLicenceeFilter,
  addLocationAccessFilter,
  addMachineTypeFilter,
  addOnlineStatusFilter,
  addGameTypeFilter,
  runStatusAndLocationCounts,
  buildLocationCountFilter,
} from '@/app/api/lib/helpers/cabinets/statusOperations';

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
    const gameType = searchParams.get('gameType');
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
    let userRoles: string[] = [];
    let userLocationPermissions: string[] = [];
    let userAccessibleLicencees: string[] | 'all' = [];

    const userPayload = await getUserFromServer();
    userRoles = (userPayload?.roles as string[]) || [];
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

    // Build base aggregation pipeline with location join
    const isArchivedRequest = onlineStatus === 'archived';
    const aggregationPipeline = createBasePipeline(isArchivedRequest);

    // Apply search filter
    addSearchFilter(aggregationPipeline, search || null);

    // Apply licencee filter
    addLicenceeFilter(aggregationPipeline, effectiveLicencee);

    // Apply location access filter
    const hasAccess = addLocationAccessFilter(
      aggregationPipeline,
      locationId,
      allowedLocationIds
    );
    if (!hasAccess) {
      return NextResponse.json({
        totalMachines: 0,
        onlineMachines: 0,
        offlineMachines: 0,
      });
    }

    // Apply machine type filters
    addMachineTypeFilter(aggregationPipeline, machineTypeFilter);

    // Apply online/offline status filter
    addOnlineStatusFilter(aggregationPipeline, onlineStatus, threeMinutesAgo);

    // Apply game type filter
    addGameTypeFilter(aggregationPipeline, gameType);

    // Run all status and location counts in a single optimized pass
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const counts = await runStatusAndLocationCounts(
      aggregationPipeline,
      threeMinutesAgo,
      fourHoursAgo,
      twentyFourHoursAgo
    );

    // Query GamingLocations directly for total location count
    const locationCountFilter = buildLocationCountFilter(
      search || null,
      effectiveLicencee,
      locationId,
      allowedLocationIds,
      machineTypeFilter,
      isArchivedRequest
    );
    const totalLocations = await GamingLocations.countDocuments({
      $and: locationCountFilter,
    });
    const onlineLocations = counts.onlineLocations;
    const offlineLocations = Math.max(0, totalLocations - onlineLocations);

    // ============================================================================
    // STEP 6: Return machine status counts
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/cabinets/status',
      1,
      user,
      duration
    );
    return NextResponse.json({
      totalMachines: counts.totalMachines,
      onlineMachines: counts.onlineMachines,
      offlineMachines: counts.offlineMachines,
      criticalOffline: counts.criticalOffline,
      recentOffline: counts.recentOffline,
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
