/**
 * Machine Analytics API Route
 *
 * This route handles fetching machine analytics data with role-based access control.
 * It supports:
 * - Filtering by location and licensee
 * - Role-based location filtering
 * - Sorting by total drop (highest performers first)
 * - Pagination with limit
 *
 * @module app/api/analytics/machines/route
 */

import { getMachineAnalytics } from '@/app/api/lib/helpers/analytics';
import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching machine analytics
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

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 5;
    const selectedLicensee =
      searchParams.get('licensee') || searchParams.get('licencee') || undefined;
    const selectedLocation = searchParams.get('location') || undefined;

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Authenticate user and get accessible locations
    // ============================================================================
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    let userLocationPermissions: string[] = [];
    if (Array.isArray((userPayload as { assignedLocations?: string[] })?.assignedLocations)) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] }).assignedLocations;
    }

    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      selectedLicensee || undefined,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 4: Validate location access
    // ============================================================================
    if (allowedLocationIds !== 'all') {
      if (!Array.isArray(allowedLocationIds) || allowedLocationIds.length === 0) {
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          console.warn(`[Analytics Machines GET API] No access after ${duration}ms`);
        }
        return NextResponse.json({ machines: [] });
      }

      if (selectedLocation && !allowedLocationIds.includes(selectedLocation)) {
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          console.warn(`[Analytics Machines GET API] Location not accessible after ${duration}ms`);
        }
        return NextResponse.json({ machines: [] });
      }
    }

    // ============================================================================
    // STEP 5: Fetch machine analytics data
    // ============================================================================
    const machines = await getMachineAnalytics(
      allowedLocationIds,
      selectedLocation,
      selectedLicensee,
      limit
    );

    // ============================================================================
    // STEP 6: Return machine analytics
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Machines GET API] Completed in ${duration}ms`);
    }
    return NextResponse.json({ machines });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';
    console.error(
      `[Machine Analytics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
