/**
 * Membership Count API Route
 *
 * This route returns the count of locations with membership enabled.
 *
 * @module app/api/locations/membership-count/route
 */

import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for membership count
 *
 * Flow:
 * 1. Parse licensee parameter
 * 2. Connect to database and authenticate user
 * 3. Get user location permissions
 * 4. Count locations with membership enabled
 * 5. Return count
 */
export async function GET(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Parse request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const licensee =
      searchParams.get('licensee') || searchParams.get('licencee');
    const locationId = searchParams.get('locationId');

    // ============================================================================
    // STEP 2: Connect to database and authenticate user
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed', membershipCount: 0 },
        { status: 500 }
      );
    }

    const user = await getUserFromServer();

    // Get user's accessible licensees
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();

    // Get user's location permissions and roles
    const userLocationPermissions = ((
      user?.resourcePermissions as
        | Record<
            string,
            {
              resources?: Array<{ _id: string }>;
            }
          >
        | undefined
    )?.['gaming-locations']?.resources?.map((r: { _id: string }) => r._id) ||
      []) as string[];
    const userRoles = (user?.roles || []) as string[];

    // ============================================================================
    // STEP 3: Get user location permissions
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      licensee || undefined,
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

    // Apply licensee filter if provided
    if (licensee && licensee !== 'all') {
      query['rel.licencee'] = licensee;
    }

    // Apply specific location filter if provided
    if (locationId) {
      query._id = locationId;
    }

    // ============================================================================
    // STEP 5: Count locations with membership enabled
    // ============================================================================
    const membershipCount = await GamingLocations.countDocuments(query);

    return NextResponse.json({ membershipCount });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    console.error('[API Error] Membership count:', errorMessage);
    return NextResponse.json(
      { error: errorMessage, membershipCount: 0 },
      { status: 500 }
    );
  }
}
