/**
 * Machines Report API Route
 *
 * This route handles fetching machine reports with various filtering options.
 * It supports:
 * - Multiple report types (overview, stats, all, offline)
 * - Time period filtering (today, week, month, custom dates)
 * - Licensee filtering
 * - Location filtering
 * - Online/offline status filtering
 * - Search functionality
 * - Currency conversion (Admin/Developer only for "All Licensees")
 * - Pagination
 *
 * @module app/api/reports/machines/route
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import {
    getAllMachines,
    getMachineStats,
    getOfflineMachines,
    getOverviewMachines,
} from '@/app/api/lib/helpers/reports/machines';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { TimePeriod } from '@/app/api/lib/types';
import { getDatesForTimePeriod } from '@/app/api/lib/utils/dates';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching machines report
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Authenticate user and get location permissions
 * 3. Connect to database
 * 4. Build match filters for machines and locations
 * 5. Route to appropriate handler based on requested type
 * 6. Transform and return data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'overview', 'stats', 'all', 'offline'
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';

    const licencee =
      searchParams.get('licensee') || searchParams.get('licencee') || undefined;
    const onlineStatus = searchParams.get('onlineStatus') || 'all';
    const searchTerm = searchParams.get('search');
    const locationId = searchParams.get('locationId');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    // Pagination parameters for overview
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '10');
    const limit = Math.min(requestedLimit, 500);
    const skip = (page - 1) * limit;

    // Parse dates
    let startDate: Date | undefined, endDate: Date | undefined;
    if (timePeriod === 'Custom') {
      const customStart = searchParams.get('startDate');
      const customEnd = searchParams.get('endDate');
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: 'Missing startDate or endDate' },
          { status: 400 }
        );
      }
      startDate = new Date(customStart + 'T00:00:00-04:00');
      endDate = new Date(customEnd + 'T23:59:59-04:00');
    } else {
      const dates = getDatesForTimePeriod(timePeriod);
      startDate = dates.startDate;
      endDate = dates.endDate;
    }

    // ============================================================================
    // STEP 2: Authenticate user and get location permissions
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    const assignedLicensees =
      (userPayload as { assignedLicensees?: string[] })?.assignedLicensees ||
      [];
    const assignedLocations =
      (userPayload as { assignedLocations?: string[] })?.assignedLocations ||
      [];

    const allowedLocationIds = await getUserLocationFilter(
      isAdminOrDev ? 'all' : assignedLicensees,
      licencee,
      assignedLocations,
      userRoles
    );

    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 0 },
      });
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'DB connection failed' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 4: Build match filters for machines and locations
    // ============================================================================
    const machineMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    };

    if (allowedLocationIds !== 'all') {
      machineMatchStage.gamingLocation = { $in: allowedLocationIds };
    }

    if (onlineStatus !== 'all') {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      if (onlineStatus === 'online') {
        machineMatchStage.lastActivity = { $gte: threeMinutesAgo };
      } else {
        machineMatchStage.$or = [
          { lastActivity: { $lt: threeMinutesAgo } },
          { lastActivity: { $exists: false } },
        ];
      }
    }

    if (searchTerm?.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: 'i' } },
        { origSerialNumber: { $regex: searchTerm, $options: 'i' } },
        { game: { $regex: searchTerm, $options: 'i' } },
        { manufacturer: { $regex: searchTerm, $options: 'i' } },
        { 'custom.name': { $regex: searchTerm, $options: 'i' } },
      ];
    }

    if (locationId && locationId !== 'all') {
      const requestedIds = locationId.split(',').filter(id => id.trim());
      if (allowedLocationIds !== 'all') {
        const accessible = requestedIds.filter(id =>
          allowedLocationIds.includes(id)
        );
        if (accessible.length === 0) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        machineMatchStage.gamingLocation =
          accessible.length === 1 ? accessible[0] : { $in: accessible };
      } else {
        machineMatchStage.gamingLocation =
          requestedIds.length === 1 ? requestedIds[0] : { $in: requestedIds };
      }
    }

    const locationMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    };

    if (allowedLocationIds !== 'all') {
      locationMatchStage._id = { $in: allowedLocationIds };
    }

    if (licencee && licencee !== 'all') {
      locationMatchStage['rel.licencee'] = licencee;
    }

    // ============================================================================
    // STEP 5: Route to appropriate handler based on requested type
    // ============================================================================
    let result;
    switch (type) {
      case 'stats':
        result = await getMachineStats(
          machineMatchStage,
          locationMatchStage,
          startDate,
          endDate,
          licencee,
          displayCurrency,
          isAdminOrDev
        );
        break;
      case 'overview':
        result = await getOverviewMachines(
          machineMatchStage,
          locationMatchStage,
          page,
          limit,
          skip,
          startDate,
          endDate
        );
        break;
      case 'all':
        result = await getAllMachines(
          searchParams,
          startDate,
          endDate,
          locationMatchStage
        );
        break;
      case 'offline':
        result = await getOfflineMachines(
          searchParams,
          page,
          limit,
          skip,
          startDate,
          endDate,
          locationMatchStage
        );
        break;
      default:
        result = await getOverviewMachines(
          machineMatchStage,
          locationMatchStage,
          page,
          limit,
          skip,
          startDate,
          endDate
        );
    }

    // ============================================================================
    // STEP 6: Return result with performance tracking
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(`[Reports Machines API] Slow response: ${duration}ms`);
    }

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
