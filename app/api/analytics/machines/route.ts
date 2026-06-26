/**
 * Machine Analytics API Route
 *
 * This route handles fetching machine analytics data with role-based access control.
 * It supports:
 * - Filtering by location and licencee
 * - Role-based location filtering
 * - Sorting by total drop (highest performers first)
 * - Pagination with limit
 *
 * @module app/api/analytics/machines/route
 */

import { getMachineAnalytics } from '@/app/api/lib/helpers/reports/analytics';
import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/analytics/machines
 *
 * Returns the top-performing machines sorted by total drop, respecting role-based location access. Used by the Analytics machines widget.
 *
 * Query params:
 * @param limit    {number} Optional. Maximum number of machines to return. Defaults to 5.
 * @param licencee {string} Optional. Scopes results to this licencee.
 * @param location {string} Optional. Single location ID to restrict results to one location.
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Authenticate user and get accessible locations
 * 4. Validate location access
 * 5. Fetch machine analytics data
 * 6. Return machine analytics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/analytics/machines';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const limit = Number(searchParams.get('limit')) || 5;
      const selectedLicencee = searchParams.get('licencee') || undefined;
      const selectedLocation = searchParams.get('location') || undefined;

      // ============================================================================
      // STEP 2: Authenticate user and get accessible locations
      // ============================================================================
      const userAccessibleLicencees =
        await getUserAccessibleLicenceesFromToken();
      const userPayload = await getUserFromServer();
      const userRoles = (userPayload?.roles as string[]) || [];
      let userLocationPermissions: string[] = [];
      if (
        Array.isArray(
          (userPayload as { assignedLocations?: string[] })?.assignedLocations
        )
      ) {
        userLocationPermissions = (
          userPayload as { assignedLocations: string[] }
        ).assignedLocations;
      }

      const allowedLocationIds = await getUserLocationFilter(
        userAccessibleLicencees,
        selectedLicencee || undefined,
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
          return NextResponse.json({ machines: [] });
        }

        if (
          selectedLocation &&
          !allowedLocationIds.includes(selectedLocation)
        ) {
          return NextResponse.json({ machines: [] });
        }
      }

      // ============================================================================
      // STEP 4: Fetch machine analytics data
      // ============================================================================
      const machines = await getMachineAnalytics(
        allowedLocationIds,
        selectedLocation,
        selectedLicencee,
        limit
      );

      // ============================================================================
      // STEP 5: Return machine analytics
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/analytics/machines',
        Array.isArray(machines) ? machines.length : 1,
        user,
        duration
      );

      if (duration > 1000) {
        console.warn(`[${functionName}] Slow response — ${duration}ms`);
      }

      return NextResponse.json({ machines });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Internal Server Error';
      logRouteError(
        functionName,
        'GET',
        '/api/analytics/machines',
        errorMessage,
        user
      );
      console.error(`[${functionName}] Error:`, errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}
