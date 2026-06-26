/**
 * Collection Report V2 — Sessions API
 *
 * GET  /api/collection-reports-v2/sessions  — List all sessions (grouped by sessionId)
 * POST /api/collection-reports-v2/sessions  — Start a new capture session for a location
 *
 * @module app/api/collection-reports-v2/sessions/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Machine } from '@/app/api/lib/models/machines';
import { determineAllowedLocationIds } from '@/app/api/lib/helpers/collectionReport/queries';
import {
  extractUserFromRequest,
  logRouteFetch,
  logRouteCreate,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { generateMongoId } from '@/lib/utils/id';
import type { MachineDocument } from '@/shared/types/models';
import { NextRequest, NextResponse } from 'next/server';
import type { TimePeriod } from '@/app/api/lib/types';
import {
  extractUserPayload,
  resolveLicenceeParam,
  buildSessionSortConfig,
  buildDateFilter,
  buildSessionListMatchStage,
  buildSessionListPipeline,
  buildSessionCountPipeline,
  lookupPreviousSessionEndTime,
  lookupLastSessionEndTimes,
  mapMachinesToV2Format,
  buildReportedMachineDocs,
} from '@/app/api/lib/helpers/collectionReportV2/sessionOperations';

// ============================================================================
// GET — List sessions (one row per sessionId, aggregated)
// ============================================================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/collection-reports-v2/sessions';
  const user = extractUserFromRequest(req);

  try {
    // ============================================================================
    // STEP 1: Connect and authenticate
    // ============================================================================
    await connectDB();
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const rawLicencee = searchParams.get('licencee') || undefined;
    const licencee = resolveLicenceeParam(rawLicencee ?? null);
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const search = searchParams.get('search') || undefined;
    const searchType = searchParams.get('searchType') || 'collector';
    const page = Math.max(0, parseInt(searchParams.get('page') || '1', 10) - 1);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
    const sortField = searchParams.get('sortField') || 'created';
    const sortDir = searchParams.get('sortDirection') || 'desc';

    const { sortKey, sortDirection } = buildSessionSortConfig(sortField, sortDir);
    const dateFilter = buildDateFilter(timePeriod, startDateStr, endDateStr);

    // ============================================================================
    // STEP 3: Determine allowed locations and build match stage
    // ============================================================================
    const { roles, assignedLicencees, assignedLocations } = extractUserPayload(
      userPayload as unknown as Record<string, unknown>
    );
    const allowedLocationIds = await determineAllowedLocationIds(
      roles,
      assignedLicencees,
      assignedLocations
    );
    const matchStage = buildSessionListMatchStage(
      licencee,
      allowedLocationIds,
      dateFilter,
      search,
      searchType
    );

    // ============================================================================
    // STEP 4: Execute aggregation and count in parallel
    // ============================================================================
    const pipeline = buildSessionListPipeline(matchStage, sortKey, sortDirection, page, limit);
    const countPipeline = buildSessionCountPipeline(matchStage);

    const [sessions, totalResult] = await Promise.all([
      ReportedMachine.aggregate(pipeline).exec(),
      ReportedMachine.aggregate(countPipeline).exec(),
    ]);

    const total = totalResult[0]?.total ?? 0;
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[${functionName}] slow: ${duration}ms`);
    }
    logRouteFetch(functionName, 'GET', '/api/collection-reports-v2/sessions', sessions.length, user, duration);

    // ============================================================================
    // STEP 5: Return response
    // ============================================================================
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logRouteError(functionName, 'GET', '/api/collection-reports-v2/sessions', errorMessage, user);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
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
    // ============================================================================
    // STEP 1: Connect and authenticate
    // ============================================================================
    await connectDB();
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
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

    const collectorUserId = String((userPayload as unknown as Record<string, string>)._id);
    const collectorName =
      (userPayload as unknown as Record<string, string>).name ||
      (userPayload as unknown as Record<string, string>).username ||
      collectorUserId;

    // ============================================================================
    // STEP 3: Determine session timing
    // ============================================================================
    const sessionEndTime = new Date();
    const previousSessionEndTime = await lookupPreviousSessionEndTime(locationId);
    const sessionStartTime: Date | null = previousSessionEndTime;

    // ============================================================================
    // STEP 4: Verify location access
    // ============================================================================
    const payloadRecord = userPayload as unknown as Record<string, unknown>;
    const { roles, assignedLicencees, assignedLocations } = extractUserPayload(payloadRecord);
    const allowedLocationIds = await determineAllowedLocationIds(
      roles,
      assignedLicencees,
      assignedLocations
    );

    if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
      logRouteError(functionName, 'POST', '/api/collection-reports-v2/sessions', 'Location access denied', user);
      return NextResponse.json(
        { success: false, error: 'Location access denied' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 5: Fetch and map machines
    // ============================================================================
    const DELETION_FILTER = {
      $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
    };

    const machines = await Machine.find({
      gamingLocation: locationId,
      ...DELETION_FILTER,
    })
      .select('_id machineId serialNumber custom game manufacturer machineName collectionMeters sasMeters collectionTime previousCollectionTime')
      .sort({ 'custom.name': 1, _id: 1 })
      .lean<MachineDocument[]>();

    const sessionId = await generateMongoId();
    const machineList = mapMachinesToV2Format(machines);

    // ============================================================================
    // STEP 6: Look up last collection times per machine
    // ============================================================================
    const machineIdsList = machines.map(m => String(m._id));
    const lastCollectionMap = await lookupLastSessionEndTimes(machineIdsList);

    // ============================================================================
    // STEP 7: Persist machines as ReportedMachine documents
    // ============================================================================
    const collectorId = String((userPayload as unknown as Record<string, string>)._id);
    const { reportedMachineDocs } = await buildReportedMachineDocs(
      machineList,
      sessionId,
      locationId,
      locationName,
      licencee || '',
      collectorId,
      collectorName,
      sessionStartTime ?? undefined,
      sessionEndTime,
      lastCollectionMap
    );

    const inserted = await ReportedMachine.insertMany(reportedMachineDocs);
    const insertedIds = inserted.map(doc => doc._id);

    const duration = Date.now() - startTime;
    logRouteCreate(functionName, 'POST', '/api/collection-reports-v2/sessions', inserted.length, user, duration);

    // ============================================================================
    // STEP 8: Return response
    // ============================================================================
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logRouteError(functionName, 'POST', '/api/collection-reports-v2/sessions', errorMessage, user);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
