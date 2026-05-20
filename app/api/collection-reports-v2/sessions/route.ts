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
    const search = searchParams.get('search') || undefined;
    const searchType = searchParams.get('searchType') || 'collector';
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const page = Math.max(0, parseInt(searchParams.get('page') || '1', 10) - 1);
    const limit = Math.min(
      100,
      parseInt(searchParams.get('limit') || '20', 10)
    );
    const sortFieldParam = searchParams.get('sortField') || 'created';
    const sortDirectionParam = searchParams.get('sortDirection') || 'desc';

    let sortKey = 'createdAt';
    switch (sortFieldParam) {
      case 'location':
        sortKey = 'locationName';
        break;
      case 'collector':
        sortKey = 'collectorName';
        break;
      case 'matched':
        sortKey = 'machinesConfirmed';
        break;
      case 'machineGross':
        sortKey = 'totalMachineGross';
        break;
      case 'sasGross':
        sortKey = 'totalSasGross';
        break;
      case 'variation':
        sortKey = 'totalGrossDifference';
        break;
      case 'created':
      default:
        sortKey = 'createdAt';
        break;
    }

    const sortDirectionValue = sortDirectionParam === 'asc' ? 1 : -1;

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

    // Guard: only privileged roles may query archived sessions.
    // admin/developer/owner → unrestricted access.
    // location admin → restricted to their assignedLocations (enforced below).
    // All other roles (collector, technician, reviewer, …) are denied.
    const canViewArchived =
      userRoles.includes('developer') ||
      userRoles.includes('owner') ||
      userRoles.includes('admin') ||
      userRoles.includes('location admin');

    if (includeDeleted && !canViewArchived) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions to view archived sessions',
        },
        { status: 403 }
      );
    }

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
    // Soft-delete / archived filter
    if (includeDeleted) {
      // Archived mode: only return soft-deleted sessions
      matchStage.$and = [
        { deletedAt: { $exists: true } },
        { deletedAt: { $ne: null } },
        ...(search
          ? [
              {
                [(() => {
                  switch (searchType) {
                    case 'location':
                      return 'locationName';
                    case 'sessionId':
                      return 'sessionId';
                    case 'locationId':
                      return 'locationId';
                    default:
                      return 'collectorName';
                  }
                })()]: { $regex: search, $options: 'i' },
              },
            ]
          : []),
      ];
    } else if (search) {
      // Normal mode with search
      let searchKey = 'collectorName';
      switch (searchType) {
        case 'location':
          searchKey = 'locationName';
          break;
        case 'sessionId':
          searchKey = 'sessionId';
          break;
        case 'locationId':
          searchKey = 'locationId';
          break;
        default:
          searchKey = 'collectorName';
      }
      matchStage.$and = [
        { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
        { [searchKey]: { $regex: search, $options: 'i' } },
      ];
    } else {
      // Normal mode: exclude archived (soft-deleted) sessions
      matchStage.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];
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
            totalMachineGross: {
              $sum: {
                $cond: [
                  { $ifNull: ['$movement.machineGross', false] },
                  '$movement.machineGross',
                  {
                    $subtract: [
                      { $ifNull: ['$manualMetersIn', '$sasMetersIn'] },
                      { $ifNull: ['$manualMetersOut', '$sasMetersOut'] },
                    ],
                  },
                ],
              },
            },
            totalSasGross: {
              $sum: {
                $cond: [
                  { $ifNull: ['$sasGross', false] },
                  '$sasGross',
                  {
                    $subtract: [
                      { $ifNull: ['$sasMetersIn', 0] },
                      { $ifNull: ['$sasMetersOut', 0] },
                    ],
                  },
                ],
              },
            },
            createdAt: { $min: '$createdAt' },
            deletedAt: { $first: '$deletedAt' },
          },
        },
        {
          $addFields: {
            totalGrossDifference: {
              $subtract: ['$totalMachineGross', '$totalSasGross'],
            },
          },
        },
        { $sort: { [sortKey]: sortDirectionValue, _id: 1 } },
        { $skip: page * limit },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            let: { collectorId: '$collector' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$collectorId'] } } },
              {
                $project: {
                  _id: 0,
                  firstName: { $ifNull: ['$profile.firstName', ''] },
                  lastName: { $ifNull: ['$profile.lastName', ''] },
                  emailAddress: { $ifNull: ['$emailAddress', ''] },
                },
              },
            ],
            as: 'collectorDetails',
          },
        },
        {
          $unwind: {
            path: '$collectorDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            collectorFirstName: '$collectorDetails.firstName',
            collectorLastName: '$collectorDetails.lastName',
            collectorEmail: '$collectorDetails.emailAddress',
          },
        },
        { $project: { collectorDetails: 0 } },
        {
          $lookup: {
            from: 'gaminglocations',
            let: { locId: '$locationId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$locId'] } } },
              {
                $project: {
                  _id: 0,
                  noSMIBLocation: { $ifNull: ['$noSMIBLocation', false] },
                },
              },
            ],
            as: 'locationDetails',
          },
        },
        {
          $unwind: {
            path: '$locationDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            noSMIBLocation: {
              $ifNull: ['$locationDetails.noSMIBLocation', false],
            },
          },
        },
        { $project: { locationDetails: 0 } },
        // For noSMIB locations every captured/confirmed machine is implicitly
        // matched (no SMIB means there are no SAS meters to compare against).
        // Override machinesConfirmed so the MATCHED column shows the correct count.
        {
          $addFields: {
            machinesConfirmed: {
              $cond: [
                '$noSMIBLocation',
                '$machinesCaptured',
                '$machinesConfirmed',
              ],
            },
          },
        },
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

    const collectorUserId = String(userPayload._id);
    const collectorName =
      (userPayload as unknown as Record<string, string>).name ||
      (userPayload as unknown as Record<string, string>).username ||
      collectorUserId;

    // Determine session timing
    const sessionEndTime = new Date();
    let sessionStartTime: Date | null = null;

    // Look up the most recent submitted session for this location
    const previousSession = await ReportedMachine.findOne({
      locationId,
      sessionStatus: 'submitted',
      sessionEndTime: { $exists: true, $ne: null },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .sort({ sessionEndTime: -1 })
      .select('sessionEndTime')
      .lean();

    if (previousSession?.sessionEndTime) {
      sessionStartTime = new Date(previousSession.sessionEndTime);
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
        sasMetersIn: sasIn || fallbackIn,
        sasMetersOut: sasOut || fallbackOut,
        collectionTime: (machine.collectionTime as Date | undefined) || null,
        sequenceOrder: index,
      };
    });

    // Look up last V2 submission sasEndTime for these machines
    const machineIdsList = machines.map(m => String(m._id));
    const previousSubmissions = await ReportedMachine.aggregate([
      {
        $match: {
          machineId: { $in: machineIdsList },
          sessionStatus: 'submitted',
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        },
      },
      { $sort: { sasEndTime: -1 } },
      { $group: { _id: '$machineId', sasEndTime: { $first: '$sasEndTime' } } },
    ]);

    const lastCollectionMap = new Map(
      previousSubmissions.map(s => [s._id as string, s.sasEndTime as Date])
    );

    // Persist machines as ReportedMachine documents
    const collectorId = String(userPayload._id);
    const machineIds = await Promise.all(
      machineList.map(() => generateMongoId())
    );
    const reportedMachines = machineList.map((machine, index) => {
      const sasStartTime =
        lastCollectionMap.get(machine.machineId) ??
        machine.collectionTime ??
        undefined;

      return {
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
        sasMetersIn: machine.sasMetersIn,
        sasMetersOut: machine.sasMetersOut,
        sequenceOrder: machine.sequenceOrder,
        sessionStartTime: sessionStartTime ?? undefined,
        sessionEndTime,
        sasStartTime,
        status: 'pending' as const,
      };
    });

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
