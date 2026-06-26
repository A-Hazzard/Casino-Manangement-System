/**
 * Membership Count API Route
 *
 * This route returns the count of locations with membership enabled.
 *
 * @module app/api/locations/membership-count/route
 */

import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for membership count
 *
 * @param {string} licencee - Filter count by licencee name
 * @param {string} locationId - Filter count by specific location ID
 *
 * Flow:
 * 1. Parse licencee parameter
 * 2. Connect to database and authenticate user
 * 3. Get user location permissions
 * 4. Count locations with membership enabled
 * 5. Return count
 */
export async function GET(req: NextRequest) {
  return withApiAuth(req, async ({ user, userRoles }) => {
    const startTime = Date.now();
    const functionName = 'GET /api/locations/membership-count';
    const logUser = extractUserFromRequest(req);

    try {
      // ============================================================================
      // STEP 1: Parse request parameters
      // ============================================================================
      const { searchParams } = new URL(req.url);
      const licencee = searchParams.get('licencee');
      const locationId = searchParams.get('locationId');

      // ============================================================================
      // STEP 2: Resolve user accessible licencees and permissions
      // ============================================================================
      const userAccessibleLicencees =
        await getUserAccessibleLicenceesFromToken();

      // Get user's location permissions
      const userLocationPermissions = ((
        user.resourcePermissions as
          | Record<
              string,
              {
                resources?: Array<{ _id: string }>;
              }
            >
          | undefined
      )?.['gaming-locations']?.resources?.map(
        (resource: { _id: string }) => resource._id
      ) || []) as string[];

      // ============================================================================
      // STEP 3: Get user location permissions
      // ============================================================================
      const allowedLocationIds = await getUserLocationFilter(
        userAccessibleLicencees,
        licencee || undefined,
        userLocationPermissions,
        userRoles
      );

      // ============================================================================
      // STEP 4: Build query for membership-enabled locations
      // ============================================================================
      const query: Record<string, unknown> = {
        $and: [
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          },
          // Check both membershipEnabled and enableMembership fields for compatibility
          {
            $or: [{ membershipEnabled: true }, { enableMembership: true }],
          },
        ],
      };

      // Apply location permissions
      if (allowedLocationIds !== 'all') {
        if (allowedLocationIds.length === 0) {
          return NextResponse.json({ membershipCount: 0 });
        }
        query._id = { $in: allowedLocationIds };
      }

      // Apply licencee filter if provided
      if (licencee && licencee !== 'all') {
        query['rel.licencee'] = licencee;
      }

      // Apply specific location filter if provided
      if (locationId) {
        query._id = locationId;
      }

      // ============================================================================
      // STEP 5: Count locations with membership enabled
      // ============================================================================
      const membershipCount = await GamingLocations.countDocuments(query);

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/locations/membership-count',
        1,
        logUser,
        duration
      );
      if (duration > 1000) {
        console.warn(`[Membership Count API] Completed in ${duration}ms`);
      }

      return NextResponse.json({ membershipCount });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Server Error';
      logRouteError(
        functionName,
        'GET',
        '/api/locations/membership-count',
        errorMessage,
        logUser
      );
      console.error('[API Error] Membership count:', errorMessage);
      return NextResponse.json(
        { error: errorMessage, membershipCount: 0 },
        { status: 500 }
      );
    }
  });
}
