/**
 * Machines Locations API Route
 *
 * This route handles fetching locations available for machines.
 * It supports:
 * - Licencee filtering
 * - Role-based access control
 * - Country name lookup
 * - Location permission filtering
 *
 * @module app/api/machines/locations/route
 */

import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching locations for machines
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (licencee/licencee)
 * 3. Get user's accessible licencees and permissions
 * 4. Determine allowed location IDs
 * 5. Build aggregation pipeline
 * 6. Execute aggregation with country lookup
 * 7. Return locations with country names
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    // Support both 'licencee' and 'licencee' spelling for backwards compatibility
    const licencee = (searchParams.get('licencee'));
    const membershipOnly =
      searchParams.get('membershipOnly') === 'true' ||
      searchParams.get('membershipOnly') === '1';

    // ============================================================================
    // STEP 3: Get user's accessible licencees and permissions
    // ============================================================================
    const userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    // Use only new field
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }

    // ============================================================================
    // STEP 4: Determine allowed location IDs
    // ============================================================================
    const finalLicencee = licencee || licencee;
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicencees,
      finalLicencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // If user has no accessible locations, return empty
    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      return NextResponse.json({ locations: [] }, { status: 200 });
    }

    // ============================================================================
    // STEP 5: Build aggregation pipeline
    // ============================================================================
    interface MatchStage {
      $or?: Array<Record<string, unknown>>;
      $and?: Array<Record<string, unknown>>;
      _id?: { $in: string[] };
      [key: string]: unknown;
    }

    const matchStage: MatchStage = {};

    // Exclude soft-deleted locations
    // For membership-only flows, use a stricter cutoff (2025) as requested
    const deletionCutoff = membershipOnly
      ? new Date('2025-01-01')
      : new Date('2025-01-01');

    const basicDeletionFilter = [
      { deletedAt: null },
      { deletedAt: { $lt: deletionCutoff } },
    ];

    if (membershipOnly) {
      // Check both membershipEnabled and enableMembership fields for compatibility
      matchStage.$and = [
        { $or: basicDeletionFilter },
        {
          $or: [{ membershipEnabled: true }, { enableMembership: true }],
        },
      ];
    } else {
      matchStage.$or = basicDeletionFilter;
    }

    // Apply location filter based on user permissions
    if (allowedLocationIds !== 'all') {
      matchStage._id = { $in: allowedLocationIds };
    }

    // ============================================================================
    // STEP 6: Execute aggregation with country lookup
    // ============================================================================
    const locations = await GamingLocations.aggregate([
      // Only include non-deleted locations and match licencee if provided
      { $match: matchStage },
      // Lookup country details
      {
        $lookup: {
          from: 'countries',
          localField: 'country',
          foreignField: '_id',
          as: 'countryDetails',
        },
      },
      // Unwind the countryDetails array
      {
        $unwind: {
          path: '$countryDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project only needed fields
      {
        $project: {
          _id: 1,
          name: 1,
          countryName: '$countryDetails.name',
        },
      },
      // Sort by name
      {
        $sort: { name: 1 },
      },
    ]);

    // ============================================================================
    // STEP 7: Return locations with country names
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Machines Locations API] Completed in ${duration}ms`);
    }
    return NextResponse.json({ locations }, { status: 200 });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch locations';
    console.error(
      `[Machines Locations API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

