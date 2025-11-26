/**
 * Machine Statistics API Route
 *
 * This route handles fetching machine statistics with role-based access control.
 * It supports:
 * - Filtering by licensee
 * - Role-based location filtering
 * - Machine counts (total, online, SAS)
 * - Financial metrics (drop, cancelled credits, gross)
 *
 * @module app/api/analytics/machines/stats/route
 */

import { getMachineStatsForAnalytics } from '@/app/api/lib/helpers/analytics';
import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching machine statistics
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
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const licensee =
      searchParams.get('licensee') || searchParams.get('licencee');
    const effectiveLicensee =
      licensee && licensee.toLowerCase() !== 'all' ? licensee : null;

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
    const userLocationPermissions =
      (
        userPayload?.resourcePermissions as {
          'gaming-locations'?: { resources?: string[] };
        }
      )?.['gaming-locations']?.resources || [];

    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      effectiveLicensee ?? undefined,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 4: Validate location access
    // ============================================================================
    if (allowedLocationIds !== 'all') {
      if (
        !Array.isArray(allowedLocationIds) ||
        allowedLocationIds.length === 0
      ) {
        const zeroStats = {
          totalDrop: 0,
          totalCancelledCredits: 0,
          totalGross: 0,
          totalMachines: 0,
          onlineMachines: 0,
          sasMachines: 0,
        };
        return NextResponse.json({
          stats: zeroStats,
          totalMachines: 0,
          onlineMachines: 0,
          offlineMachines: 0,
        });
      }
    }

    // ============================================================================
    // STEP 5: Fetch machine statistics
    // ============================================================================
    const result = await getMachineStatsForAnalytics(allowedLocationIds);

    // ============================================================================
    // STEP 6: Return machine statistics
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Analytics Machines Stats GET API] Completed in ${duration}ms`);
    }
    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch machine stats';
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
}
