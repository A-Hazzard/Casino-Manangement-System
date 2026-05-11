/**
 * Collection Report V2 — Session Detail API
 *
 * GET /api/collection-reports-v2/sessions/[sessionId]
 * Returns all reported machines for a single session, ordered by sequenceOrder.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { determineAllowedLocationIds } from '@/app/api/lib/helpers/collectionReport/queries';
import {
  extractUserFromRequest,
  logRouteFetch,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import {
  logRouteDelete,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'GET /api/collection-reports-v2/sessions/[sessionId]';
  const user = extractUserFromRequest(req);

  let sessionId = '';

  try {
    await connectDB();

    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Fetch all machines for this session
    const machines = await ReportedMachine.find({ sessionId })
      .sort({ sequenceOrder: 1 })
      .lean();

    if (machines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify user can access this session's location
    const sessionLocationId = machines[0].locationId;
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
      !allowedLocationIds.includes(sessionLocationId)
    ) {
      logRouteError(
        functionName,
        'GET',
        `/api/collection-reports-v2/sessions/${sessionId}`,
        'Location access denied',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build session summary from machines
    const sessionData = {
      sessionId,
      sessionStatus: machines[0].sessionStatus,
      locationId: sessionLocationId,
      locationName: machines[0].locationName,
      licencee: machines[0].licencee,
      collector: machines[0].collector,
      collectorName: machines[0].collectorName,
      machinesTotal: machines.length,
      machinesCaptured: machines.filter(m =>
        ['captured', 'confirmed'].includes(m.status)
      ).length,
      machinesConfirmed: machines.filter(m => m.status === 'confirmed').length,
      machinesSkipped: machines.filter(m => m.status === 'skipped').length,
      createdAt: machines[0].createdAt,
      machines: machines.map(m => ({
        reportedMachineId: m._id,
        machineId: m.machineId,
        machineName: m.machineName,
        machineCustomName: m.machineCustomName,
        serialNumber: m.serialNumber,
        manufacturer: m.manufacturer,
        game: m.game,
        status: m.status,
        sequenceOrder: m.sequenceOrder,
        systemMetersIn: m.systemMetersIn,
        systemMetersOut: m.systemMetersOut,
        sasStartTime: m.sasStartTime,
        sasEndTime: m.sasEndTime,
        imageFileId: m.imageFileId,
        imageName: m.imageName,
        imageData:
          m.imageData ||
          (m.imageFileId
            ? `/api/collection-reports-v2/files/${m.imageFileId}`
            : undefined),
        metersMatch: m.metersMatch,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      `/api/collection-reports-v2/sessions/${sessionId}`,
      machines.length,
      user,
      duration
    );

    return NextResponse.json({ success: true, data: sessionData });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      `/api/collection-reports-v2/sessions/${sessionId}`,
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
// DELETE — Cancel/delete an in-progress session
// ============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/collection-reports-v2/sessions/[sessionId]';
  const user = extractUserFromRequest(req);

  let sessionId = '';

  try {
    await connectDB();

    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only developers and admins can delete sessions
    const userPayloadRecord = userPayload as unknown as Record<string, unknown>;
    const userRoles = (userPayloadRecord.roles as string[]) || [];
    if (!userRoles.includes('developer') && !userRoles.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Check the session exists and is in-progress
    const existing = await ReportedMachine.findOne({ sessionId })
      .select('sessionStatus')
      .lean();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    if (existing.sessionStatus === 'submitted') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a submitted session' },
        { status: 400 }
      );
    }

    const result = await ReportedMachine.deleteMany({ sessionId });

    const duration = Date.now() - startTime;
    logRouteDelete(
      functionName,
      'DELETE',
      `/api/collection-reports-v2/sessions/${sessionId}`,
      result.deletedCount,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data: { sessionId, deletedCount: result.deletedCount },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'DELETE',
      `/api/collection-reports-v2/sessions/${sessionId}`,
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
