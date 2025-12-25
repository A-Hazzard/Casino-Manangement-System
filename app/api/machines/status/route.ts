/**
 * Machine Status API Route
 *
 * This route handles fetching machine online/offline status based on lastActivity.
 * It supports:
 * - Filtering by licensee
 * - Role-based location filtering
 * - Online/offline counts based on lastActivity (3 minute threshold)
 * - Admin/Developer: all machines for selected licensee
 * - Other roles: only machines for assigned locations
 *
 * @module app/api/machines/status/route
 */

import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching machine status
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Authenticate user and get accessible locations
 * 4. Determine location filter based on user role and selected licensee
 * 5. Query machines with lastActivity and calculate online/offline status
 * 6. Return machine status counts
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const licensee =
      searchParams.get('licensee') || searchParams.get('licencee');
    const effectiveLicensee =
      licensee && licensee.toLowerCase() !== 'all' ? licensee : undefined;
    const locationId = searchParams.get('locationId');
    const machineTypeFilter = searchParams.get('machineTypeFilter');

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        {
          error: 'Database connection failed',
          totalMachines: 0,
          onlineMachines: 0,
          offlineMachines: 0,
          criticalOffline: 0,
          recentOffline: 0,
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Authenticate user and get accessible locations
    // ============================================================================
    // DEV MODE: Allow bypassing auth for testing

    let userRoles: string[] = [];
    let userLocationPermissions: string[] = [];
    let userAccessibleLicensees: string[] | 'all' = [];

    // Normal mode: Get user from JWT
    const userPayload = await getUserFromServer();
    userRoles = (userPayload?.roles as string[]) || [];
    // Use only new field
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }
    userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();

    // ============================================================================
    // STEP 4: Determine location filter based on user role and selected licensee
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      effectiveLicensee,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 5: Query machines and calculate online/offline status with filters
    // ============================================================================
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // Build aggregation pipeline to join machines with locations for filtering
    const aggregationPipeline: PipelineStage[] = [
      {
        $match: {
          deletedAt: { $in: [null, new Date(-1)] },
        },
      },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'gamingLocation',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                $or: [
                  { deletedAt: null },
                  { deletedAt: { $lt: new Date('2025-01-01') } },
                ],
              },
            },
          ],
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
    ];

    // Apply licensee filter if specified (filter by location's licensee)
    if (effectiveLicensee) {
      aggregationPipeline.push({
        $match: {
          'locationDetails.rel.licencee': effectiveLicensee,
        },
      });
    }

    // Apply location access filter
    // Skip locationId filter if it's the same as the licensee ID (likely a mistake)
    const isLocationIdSameAsLicensee =
      locationId && effectiveLicensee && locationId === effectiveLicensee;

    if (locationId && !isLocationIdSameAsLicensee) {
      // Handle comma-separated location IDs (multiple locations)
      const locationIds = locationId.split(',').filter(id => id.trim() !== '');

      // Validate that user has access to all locations
      if (allowedLocationIds !== 'all') {
        if (!Array.isArray(allowedLocationIds)) {
          return NextResponse.json({
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
            criticalOffline: 0,
            recentOffline: 0,
          });
        }
        const hasAccess = locationIds.every(id =>
          allowedLocationIds.includes(id)
        );
        if (!hasAccess) {
          // User doesn't have access to one or more locations
          return NextResponse.json({
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
            criticalOffline: 0,
            recentOffline: 0,
          });
        }
      }

      // Filter by location(s)
      if (locationIds.length > 0) {
        aggregationPipeline.push({
          $match: {
            gamingLocation:
              locationIds.length === 1 ? locationIds[0] : { $in: locationIds },
          },
        });
      }
    } else if (allowedLocationIds !== 'all' && !locationId) {
      // No specific location, filter by user's accessible locations
      if (
        !Array.isArray(allowedLocationIds) ||
        allowedLocationIds.length === 0
      ) {
        // No accessible locations
        return NextResponse.json({
          totalMachines: 0,
          onlineMachines: 0,
          offlineMachines: 0,
        });
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
            filterConditions.push({
              $and: [
                { locationDetails: { $ne: null } },
                { 'locationDetails.isLocalServer': true },
              ],
            });
            break;
          case 'SMIBLocationsOnly':
            filterConditions.push({
              $and: [
                { locationDetails: { $ne: null } },
                { 'locationDetails.noSMIBLocation': { $ne: true } },
              ],
            });
            break;
          case 'NoSMIBLocation':
            filterConditions.push({
              $and: [
                { locationDetails: { $ne: null } },
                { 'locationDetails.noSMIBLocation': true },
              ],
            });
            break;
          case 'MembershipOnly':
            // Check both membershipEnabled and enableMembership fields for compatibility
            filterConditions.push({
              $and: [
                { locationDetails: { $ne: null } },
                {
                  $or: [
                    { 'locationDetails.membershipEnabled': true },
                    { 'locationDetails.enableMembership': true },
                  ],
                },
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

    // Get total machines count (ALL machines, including those without lastActivity)
    // Single result aggregation - use exec() for efficiency
    const totalCountResult = await Machine.aggregate([
      ...aggregationPipeline,
      { $count: 'total' },
    ]).exec();
    const totalCount = totalCountResult[0]?.total || 0;

    // Get online machines count (lastActivity exists AND within last 3 minutes)
    // Machines without lastActivity are considered offline
    // Single result aggregation - use exec() for efficiency
    const onlineCountResult = await Machine.aggregate([
      ...aggregationPipeline,
      {
        $match: {
          lastActivity: {
            $exists: true,
            $gte: threeMinutesAgo,
          },
        },
      },
      { $count: 'total' },
    ]).exec();
    const onlineCount = onlineCountResult[0]?.total || 0;

    // Offline = total - online (includes machines without lastActivity)
    const offlineCount = totalCount - onlineCount;

    // Calculate critical offline (24+ hours) and recent offline (< 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Critical offline: machines offline for 24+ hours
    // (lastActivity exists AND is older than 24 hours, OR lastActivity doesn't exist)
    const criticalOfflineResult = await Machine.aggregate([
      ...aggregationPipeline,
      {
        $match: {
          $or: [
            { lastActivity: { $exists: false } },
            { lastActivity: { $lt: twentyFourHoursAgo } },
          ],
        },
      },
      { $count: 'total' },
    ]).exec();
    const criticalOffline = criticalOfflineResult[0]?.total || 0;

    // Recent offline: machines offline for less than 4 hours
    // (lastActivity exists AND is between 3 minutes and 4 hours ago)
    const recentOfflineResult = await Machine.aggregate([
      ...aggregationPipeline,
      {
        $match: {
          lastActivity: {
            $exists: true,
            $gte: fourHoursAgo,
            $lt: threeMinutesAgo,
          },
        },
      },
      { $count: 'total' },
    ]).exec();
    const recentOffline = recentOfflineResult[0]?.total || 0;

    // ============================================================================
    // STEP 6: Return machine status counts
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(
        `[Machine Status API] Completed in ${duration}ms for ${totalCount} machines`
      );
    }

    return NextResponse.json({
      totalMachines: totalCount,
      onlineMachines: onlineCount,
      offlineMachines: offlineCount,
      criticalOffline,
      recentOffline,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    console.error(
      `[Machine Status API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        error: errorMessage,
        totalMachines: 0,
        onlineMachines: 0,
        offlineMachines: 0,
        criticalOffline: 0,
        recentOffline: 0,
      },
      { status: 500 }
    );
  }
}
