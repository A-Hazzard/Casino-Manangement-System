/**
 * Collection Report Locations API Route
 *
 * This route handles fetching locations for collection reports.
 * It supports:
 * - GET: Retrieves a list of locations filtered by licensee and user permissions
 *
 * @module app/api/collectionReport/locations/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { getLicenseeObjectId } from '@/lib/utils/licenseeMapping';

/**
 * Main GET handler for collection report locations
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (licensee)
 * 3. Get user's accessible licensees and permissions
 * 4. Build query filter based on access control
 * 5. Fetch locations with minimal projection
 * 6. Return locations with id and name
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    // Support both 'licensee' and 'licencee' spelling
    const rawLicenseeParam =
      searchParams.get('licensee') || searchParams.get('licencee');
    const licencee =
      rawLicenseeParam && rawLicenseeParam !== 'all'
        ? getLicenseeObjectId(rawLicenseeParam) || rawLicenseeParam
        : rawLicenseeParam;

    // ============================================================================
    // STEP 3: Get user's accessible licensees and permissions
    // ============================================================================
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json({ locations: [] }, { status: 401 });
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    const userLocationPermissions =
      (userPayload?.resourcePermissions as {
        'gaming-locations'?: { resources?: string[] };
      })?.['gaming-locations']?.resources || [];

    // ============================================================================
    // STEP 4: Build query filter based on access control
    // ============================================================================
    const deletionFilter = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    let queryFilter: Record<string, unknown>;
    if (allowedLocationIds !== 'all') {
      if (allowedLocationIds.length === 0) {
        // No accessible locations
        queryFilter = { ...deletionFilter, _id: null };
      } else {
        queryFilter = { ...deletionFilter, _id: { $in: allowedLocationIds } };
      }
    } else {
      queryFilter = deletionFilter;
    }

    // ============================================================================
    // STEP 5: Fetch locations with minimal projection
    // ============================================================================
    const locations = await GamingLocations.find(queryFilter, {
      _id: 1,
      name: 1,
    })
      .sort({ name: 1 })
      .lean();

    // ============================================================================
    // STEP 6: Return locations with id and name
    // ============================================================================
    const locationsWithId = locations.map(loc => ({
      id: String(loc._id),
      name: loc.name,
    }));

    const duration = Date.now() - startTime;
    console.log(
      `[Collection Report Locations GET API] Successfully fetched ${locationsWithId.length} locations after ${duration}ms.`
    );
    return NextResponse.json({ locations: locationsWithId });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Collection Report Locations GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ locations: [] }, { status: 500 });
  }
}
