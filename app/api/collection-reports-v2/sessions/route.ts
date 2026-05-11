/**
 * Collection Report V2 — Sessions API
 *
 * GET  /api/collection-reports-v2/sessions  — List all sessions (grouped by sessionId)
 * POST /api/collection-reports-v2/sessions  — Start a new capture session for a location
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Machine } from '@/app/api/lib/models/machines';
import { calculateDateRangeForTimePeriod } from '@/app/api/lib/helpers/collectionReport/queries';
import { determineAllowedLocationIds } from '@/app/api/lib/helpers/collectionReport/queries';
import {
  extractUserFromRequest,
  logRouteFetch,
  logRouteCreate,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { generateMongoId } from '@/lib/utils/id';
import { resolveLicenceeId } from '@/lib/utils/licencee';
import type { TimePeriod } from '@/app/api/lib/types';
import { NextRequest, NextResponse } from 'next/server';

const DELETION_FILTER = {
  $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
};

// ============================================================================
// GET — List sessions (one row per sessionId, aggregated)
// ============================================================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/collection-reports-v2/sessions';
  const user = extractUserFromRequest(req);

  try {
    await connectDB();

    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawLicencee = searchParams.get('licencee') || undefined;
    const licencee =
      rawLicencee && rawLicencee !== 'all'
        ? resolveLicenceeId(rawLicencee) || rawLicencee
        : undefined;
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const page = Math.max(0, parseInt(searchParams.get('page') || '1', 10) - 1);
    const limit = Math.min(
      100,
      parseInt(searchParams.get('limit') || '20', 10)
    );

    // Date range
    const dateRange = calculateDateRangeForTimePeriod(
      timePeriod,
      startDateStr || undefined,
      endDateStr || undefined
    );

    // Location access control
    const userPayloadRecord = userPayload as unknown as Record<string, unknown>;
    const userRoles = (userPayloadRecord.roles as string[]) || [];
    const userLicencees =
      (userPayloadRecord.assignedLicencees as string[]) || [];
    const userLocations =
      (userPayloadRecord.assignedLocations as string[]) || [];
    const allowedLocationIds = await determineAllowedLocationIds(
      userRoles,
      userLicencees,
      userLocations
    );

    // Build match stage
    const matchStage: Record<string, unknown> = {};
    if (licencee) matchStage.licencee = licencee;
    if (allowedLocationIds !== 'all') {
      matchStage.locationId = { $in: allowedLocationIds };
    }
    if (dateRange?.startDate || dateRange?.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (dateRange.startDate) dateFilter.$gte = dateRange.startDate;
      if (dateRange.endDate) dateFilter.$lte = dateRange.endDate;
      matchStage.createdAt = dateFilter;
    }

    // Aggregate sessions
    const [sessions, totalResult] = await Promise.all([
      ReportedMachine.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$sessionId',
            sessionId: { $first: '$sessionId' },
            sessionStatus: { $first: '$sessionStatus' },
            locationId: { $first: '$locationId' },
            locationName: { $first: '$locationName' },
            licencee: { $first: '$licencee' },
            collector: { $first: '$collector' },
            collectorName: { $first: '$collectorName' },
            machinesTotal: { $sum: 1 },
            machinesCaptured: {
              $sum: {
                $cond: [{ $in: ['$status', ['captured', 'confirmed']] }, 1, 0],
              },
            },
            machinesConfirmed: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
            },
            machinesSkipped: {
              $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] },
            },
            createdAt: { $min: '$createdAt' },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: page * limit },
        { $limit: limit },
      ]),
      ReportedMachine.aggregate([
        { $match: matchStage },
        { $group: { _id: '$sessionId' } },
        { $count: 'total' },
      ]),
    ]);

    const total = totalResult[0]?.total ?? 0;

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/collection-reports-v2/sessions',
      sessions.length,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data: sessions,
      pagination: {
        total,
        page: page + 1,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/collection-reports-v2/sessions',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST — Start a new capture session
// ============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/collection-reports-v2/sessions';
  const user = extractUserFromRequest(req);

  try {
    await connectDB();

    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { locationId, locationName, licencee } = body as {
      locationId: string;
      locationName: string;
      licencee?: string;
    };

    if (!locationId || !locationName) {
      return NextResponse.json(
        { success: false, error: 'locationId and locationName are required' },
        { status: 400 }
      );
    }

    // Verify user can access this location
    const userPayloadRecord = userPayload as unknown as Record<string, unknown>;
    const userRoles = (userPayloadRecord.roles as string[]) || [];
    const userLicencees =
      (userPayloadRecord.assignedLicencees as string[]) || [];
    const userLocations =
      (userPayloadRecord.assignedLocations as string[]) || [];
    const allowedLocationIds = await determineAllowedLocationIds(
      userRoles,
      userLicencees,
      userLocations
    );
    if (
      allowedLocationIds !== 'all' &&
      !allowedLocationIds.includes(locationId)
    ) {
      logRouteError(
        functionName,
        'POST',
        '/api/collection-reports-v2/sessions',
        'Location access denied',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Location access denied' },
        { status: 403 }
      );
    }

    // Fetch machines for this location
    const machines = await Machine.find({
      gamingLocation: locationId,
      ...DELETION_FILTER,
    })
      .select(
        '_id machineId serialNumber custom game manufacturer machineName collectionMeters sasMeters collectionTime'
      )
      .sort({ 'custom.name': 1, _id: 1 })
      .lean();

    const sessionId = await generateMongoId();

    const collectorName =
      (userPayload as unknown as Record<string, string>).name ||
      (userPayload as unknown as Record<string, string>).username ||
      String(userPayload._id);

    // Map machines to V2 format
    const machineList = machines.map((machine, index) => {
      const sasIn =
        (machine.sasMeters as Record<string, number> | undefined)?.drop ?? 0;
      const sasOut =
        (machine.sasMeters as Record<string, number> | undefined)
          ?.totalCancelledCredits ?? 0;
      const fallbackIn =
        (machine.collectionMeters as Record<string, number> | undefined)
          ?.metersIn ?? 0;
      const fallbackOut =
        (machine.collectionMeters as Record<string, number> | undefined)
          ?.metersOut ?? 0;
      const custom = machine.custom as { name?: string } | undefined;

      return {
        machineId: String(machine._id),
        machineName:
          (machine.machineName as string | undefined) || String(machine._id),
        machineCustomName: custom?.name || '',
        serialNumber: (machine.serialNumber as string | undefined) || '',
        manufacturer: (machine.manufacturer as string | undefined) || '',
        game: (machine.game as string | undefined) || '',
        systemMetersIn: sasIn || fallbackIn,
        systemMetersOut: sasOut || fallbackOut,
        collectionTime: (machine.collectionTime as Date | undefined) || null,
        sequenceOrder: index,
      };
    });

    // Persist machines as ReportedMachine documents
    const collectorId = String(userPayload._id);
    const machineIds = await Promise.all(
      machineList.map(() => generateMongoId())
    );
    const reportedMachines = machineList.map((machine, index) => ({
      _id: machineIds[index],
      sessionId,
      sessionStatus: 'in-progress' as const,
      locationId,
      locationName,
      licencee: licencee || '',
      machineId: machine.machineId,
      machineName: machine.machineName,
      machineCustomName: machine.machineCustomName,
      serialNumber: machine.serialNumber,
      manufacturer: machine.manufacturer,
      game: machine.game,
      collector: collectorId,
      collectorName,
      systemMetersIn: machine.systemMetersIn,
      systemMetersOut: machine.systemMetersOut,
      sequenceOrder: machine.sequenceOrder,
      status: 'pending' as const,
    }));

    const inserted = await ReportedMachine.insertMany(reportedMachines);
    const insertedIds = inserted.map(doc => doc._id);

    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/collection-reports-v2/sessions',
      inserted.length,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        locationId,
        locationName,
        licencee: licencee || '',
        collector: collectorId,
        collectorName,
        machinesTotal: inserted.length,
        machines: machineList,
        reportedMachineIds: insertedIds,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'POST',
      '/api/collection-reports-v2/sessions',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
