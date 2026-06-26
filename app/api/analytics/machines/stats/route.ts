/**
 * Machine Statistics API Route
 *
 * This route handles fetching machine statistics with role-based access control.
 * It supports:
 * - Filtering by licencee
 * - Role-based location filtering
 * - Machine counts (total, online, SAS)
 * - Financial metrics (drop, cancelled credits, gross)
 *
 * @module app/api/analytics/machines/stats/route
 */

import { getMachineStatsForAnalytics } from '@/app/api/lib/helpers/reports/analytics';
import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/analytics/machines/stats
 *
 * Returns aggregate machine statistics (total, online, SAS counts and financial totals) scoped to the user's accessible locations. Used by the Analytics machines stats panel.
 *
 * Query params:
 * @param licencee {string} Optional. Scopes results to this licencee. Pass 'all' or omit to include all accessible licencees.
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Authenticate user and get accessible locations
 * 4. Validate location access
 * 5. Fetch machine statistics
 * 6. Return machine statistics
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user, userRoles }) => {
    const startTime = Date.now();
    const functionName = 'GET /api/analytics/machines/stats';
    const logUser = extractUserFromRequest(request);

    try {
      // ============================================================================
      // STEP 1: Parse and validate request parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const licencee = searchParams.get('licencee');
      const effectiveLicencee =
        licencee && licencee.toLowerCase() !== 'all' ? licencee : null;

      // ============================================================================
      // STEP 2: Resolve accessible locations for the authenticated user
      // ============================================================================
      const userAccessibleLicencees =
        await getUserAccessibleLicenceesFromToken();
      const userLocationPermissions = Array.isArray(user.assignedLocations)
        ? user.assignedLocations
        : [];

      const allowedLocationIds = await getUserLocationFilter(
        userAccessibleLicencees,
        effectiveLicencee ?? undefined,
        userLocationPermissions,
        userRoles
      );

      // ============================================================================
      // STEP 3: Validate location access
      // ============================================================================
      if (allowedLocationIds !== 'all') {
        if (
          !Array.isArray(allowedLocationIds) ||
          allowedLocationIds.length === 0
        ) {
          return NextResponse.json({
            stats: {
              totalMachines: 0,
              onlineMachines: 0,
              sasMachines: 0,
            },
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
          });
        }
      }

      // ============================================================================
      // STEP 4: Fetch machine statistics
      // ============================================================================
      const result = await getMachineStatsForAnalytics(allowedLocationIds);

      // ============================================================================
      // STEP 5: Return machine statistics
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/analytics/machines/stats',
        1,
        logUser,
        duration
      );

      if (duration > 1000) {
        console.warn(
          `[Analytics Machines Stats GET API] Completed in ${duration}ms`
        );
      }
      return NextResponse.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch machine stats';
      logRouteError(
        functionName,
        'GET',
        '/api/analytics/machines/stats',
        errorMessage,
        logUser
      );
      console.error(
        `[Machine Stats GET API] Error after ${duration}ms:`,
        errorMessage
      );
      return NextResponse.json(
        {
          message: 'Failed to fetch machine stats',
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  });
}
