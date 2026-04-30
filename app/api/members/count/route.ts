/**
 * Members Count API Route
 *
 * This route returns the count of members (not locations).
 *
 * @module app/api/members/count/route
 */

import {
    getUserAccessibleLicenceesFromToken,
    getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Member } from '@/app/api/lib/models/members';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for members count
 *
 * @param {string} licencee - Filter count by licencee name
 * @param {string} locationId - Filter count by specific location(s) (supports comma-separated list)
 * @param {string} machineTypeFilter - Filter by machine features ('LocalServersOnly', 'SMIBLocationsOnly', 'NoSMIBLocation', 'MembershipOnly')
 *
 * Flow:
 * 1. Parse licencee and location parameters
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
    const licencee =
      searchParams.get('licencee');
    const locationId = searchParams.get('locationId');
    const machineTypeFilter = searchParams.get('machineTypeFilter');

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

    // Get user's accessible licencees
    const userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();

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
    )?.['gaming-locations']?.resources?.map((resource: { _id: string }) => resource._id) ||
      []) as string[];
    const userRoles = (user?.roles || []) as string[];

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
    // STEP 4: Build aggregation pipeline for members count with location filters
    // ============================================================================
    // Use aggregation to join members with locations for filtering
    const aggregationPipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
            { deletedAt: { $lt: new Date('2025-01-01') } }, // Include items deleted before 2025
          ],
        },
      },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'gamingLocation',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
    ];

    // Apply location access filter
    if (locationId) {
      if (locationId.includes(',')) {
        aggregationPipeline.push({
          $match: { gamingLocation: { $in: locationId.split(',') } },
        });
      } else {
        aggregationPipeline.push({
          $match: { gamingLocation: locationId },
        });
      }
    } else if (allowedLocationIds !== 'all') {
      // Apply location permissions
      if (allowedLocationIds.length === 0) {
        return NextResponse.json({ memberCount: 0 });
      }
      aggregationPipeline.push({
        $match: { gamingLocation: { $in: allowedLocationIds } },
      });
    }

    // Apply machine type filters (SMIB, No SMIB, Local Server, Membership)
    if (machineTypeFilter) {
      const filters = machineTypeFilter.split(',').filter(f => f.trim() !== '');
      const filterConditions: Record<string, unknown>[] = [];

      filters.forEach(filter => {
        switch (filter.trim()) {
          case 'LocalServersOnly':
            filterConditions.push({ 'locationDetails.isLocalServer': true });
            break;
          case 'SMIBLocationsOnly':
            filterConditions.push({
              'locationDetails.noSMIBLocation': { $ne: true },
            });
            break;
          case 'NoSMIBLocation':
            filterConditions.push({ 'locationDetails.noSMIBLocation': true });
            break;
          case 'MembershipOnly':
            // Check both membershipEnabled and enableMembership fields for compatibility
            filterConditions.push({
              $or: [
                { 'locationDetails.membershipEnabled': true },
                { 'locationDetails.enableMembership': true },
              ],
            });
            break;
        }
      });

      // Apply OR logic - location must match ANY of the selected filters
      // This allows users to see locations that match any combination of filters
      if (filterConditions.length > 0) {
        aggregationPipeline.push({ $match: { $or: filterConditions } });
      }
    }

    // ============================================================================
    // STEP 5: Count members using aggregation
    // ============================================================================
    const countResult = await Member.aggregate([
      ...aggregationPipeline,
      { $count: 'total' },
    ]).exec();
    const memberCount = countResult[0]?.total || 0;

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

