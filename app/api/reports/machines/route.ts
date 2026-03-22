import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import {
  getAllMachines,
  getMachineStats,
  getOfflineMachines,
  getOverviewMachines,
} from '@/app/api/lib/helpers/reports/machines';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { TimePeriod } from '@/app/api/lib/types';
import { getDatesForTimePeriod } from '@/app/api/lib/utils/dates';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching machines report
 */
export async function GET(req: NextRequest) {
  return withApiAuth(req, async ({ user: userPayload, userRoles, isAdminOrDev }) => {
    const startTime = Date.now();

    try {
      // ============================================================================
      // STEP 1: Parse and validate request parameters
      // ============================================================================
      const { searchParams } = new URL(req.url);
      const type = searchParams.get('type');
      const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || 'Today';
      const licencee = searchParams.get('licencee') || undefined;
      const onlineStatus = searchParams.get('onlineStatus') || 'all';
      const searchTerm = searchParams.get('search');
      const locationId = searchParams.get('locationId');
      const displayCurrency = (searchParams.get('currency') as CurrencyCode) || 'USD';

      const page = parseInt(searchParams.get('page') || '1');
      const requestedLimit = parseInt(searchParams.get('limit') || '10');
      const limit = Math.min(requestedLimit, 500);
      const skip = (page - 1) * limit;

      let startDate: Date | undefined, endDate: Date | undefined;
      if (timePeriod === 'Custom') {
        const customStart = searchParams.get('startDate');
        const customEnd = searchParams.get('endDate');
        if (!customStart || !customEnd) return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
        startDate = customStart.includes('T') ? new Date(customStart) : new Date(customStart + 'T00:00:00-04:00');
        endDate = customEnd.includes('T') ? new Date(customEnd) : new Date(customEnd + 'T23:59:59-04:00');
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
        }
      } else {
        const dates = getDatesForTimePeriod(timePeriod);
        startDate = dates.startDate;
        endDate = dates.endDate;
      }

      const assignedLicencees = (userPayload as { assignedLicencees?: string[] })?.assignedLicencees || [];
      const assignedLocations = (userPayload as { assignedLocations?: string[] })?.assignedLocations || [];

      const allowedLocationIds = await getUserLocationFilter(
        isAdminOrDev ? 'all' : assignedLicencees,
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
      // STEP 2: Build match filters
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
          const accessible = requestedIds.filter(id => allowedLocationIds.includes(id));
          if (accessible.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          machineMatchStage.gamingLocation = accessible.length === 1 ? accessible[0] : { $in: accessible };
        } else {
          machineMatchStage.gamingLocation = requestedIds.length === 1 ? requestedIds[0] : { $in: requestedIds };
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
        if (!locationMatchStage.$and) locationMatchStage.$and = [];
        (locationMatchStage.$and as Array<Record<string, unknown>>).push({
          $or: [{ 'rel.licencee': licencee }]
        });
      }

      // ============================================================================
      // STEP 3: Route to appropriate handler
      // ============================================================================
      let result;
      switch (type) {
        case 'stats':
          result = await getMachineStats(machineMatchStage, locationMatchStage, startDate, endDate, licencee, displayCurrency, isAdminOrDev, timePeriod);
          break;
        case 'offline':
          result = await getOfflineMachines(searchParams, page, limit, skip, startDate, endDate, locationMatchStage, timePeriod, searchTerm || undefined);
          break;
        case 'all':
          result = await getAllMachines(searchParams, startDate, endDate, locationMatchStage);
          break;
        default:
          result = await getOverviewMachines(machineMatchStage, locationMatchStage, page, limit, skip, startDate, endDate, timePeriod, searchTerm || undefined);
      }

      const duration = Date.now() - startTime;
      if (duration > 2000) console.warn(`[Reports Machines API] Slow response: ${duration}ms`);

      return result;
    } catch (err: unknown) {
      console.error('Reports Machines API Error:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}

