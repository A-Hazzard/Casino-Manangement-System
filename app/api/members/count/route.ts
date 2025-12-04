/**
 * Members Count API Route
 *
 * This route returns the count of members (not locations).
 *
 * @module app/api/members/count/route
 */

import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Member } from '@/app/api/lib/models/members';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for members count
 *
 * Flow:
 * 1. Parse licensee and location parameters
 * 2. Connect to database and authenticate user
 * 3. Get user location permissions
 * 4. Count members based on accessible locations
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
        { error: 'Database connection failed', memberCount: 0 },
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
    // STEP 4: Build query for members count
    // ============================================================================
    const query: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2025-01-01') } }, // Include items deleted before 2025
      ],
    };

    // If specific location is requested
    if (locationId) {
      query.gamingLocation = locationId;
    } else if (allowedLocationIds !== 'all') {
      // Apply location permissions
      if (allowedLocationIds.length === 0) {
        return NextResponse.json({ memberCount: 0 });
      }
      query.gamingLocation = { $in: allowedLocationIds };
    }

    // ============================================================================
    // STEP 5: Count members
    // ============================================================================
    const memberCount = await Member.countDocuments(query);

    return NextResponse.json({ memberCount });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    console.error('[API Error] Members count:', errorMessage);
    return NextResponse.json(
      { error: errorMessage, memberCount: 0 },
      { status: 500 }
    );
  }
}
