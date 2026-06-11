/**
 * Collection Report V2 — Session Detail API
 *
 * GET    /api/collection-reports-v2/sessions/[sessionId]  — Session detail with machines
 * DELETE /api/collection-reports-v2/sessions/[sessionId]  — Permanently delete session
 * PATCH  /api/collection-reports-v2/sessions/[sessionId]  — Update session-level fields
 *
 * @module app/api/collection-reports-v2/sessions/[sessionId]/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Meters } from '@/app/api/lib/models/meters';
import {
  extractUserFromRequest,
  logRouteFetch,
  logRouteDelete,
  logRouteUpdate,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import type { ReportedMachineDocument } from '@/app/api/lib/models/reportedMachines';
import { NextRequest, NextResponse } from 'next/server';
import {
  extractUserPayload,
  verifySessionLocationAccess,
  buildSessionDetailResponse,
  deleteSessionDriveAssets,
  fixSupplementalMetersBeforeDelete,
} from '@/app/api/lib/helpers/collectionReportV2/sessionOperations';

// ============================================================================
// GET — Fetch session detail with machines
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'GET /api/collection-reports-v2/sessions/[sessionId]';
  const user = extractUserFromRequest(req);
  let sessionId = '';

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
    // STEP 2: Parse session ID
    // ============================================================================
    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Fetch session machines
    // ============================================================================
    const sessionMatch: Record<string, unknown> = { sessionId };
    sessionMatch.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];

    const machines = await ReportedMachine.find(sessionMatch)
      .sort({ sequenceOrder: 1 })
      .lean<ReportedMachineDocument[]>();

    if (machines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Verify location access
    // ============================================================================
    const sessionLocationId = machines[0].locationId;
    const { roles, assignedLicencees, assignedLocations } = extractUserPayload(
      userPayload as unknown as Record<string, unknown>
    );

    const hasAccess = await verifySessionLocationAccess(
      sessionLocationId,
      roles,
      assignedLicencees,
      assignedLocations
    );

    if (!hasAccess) {
      logRouteError(functionName, 'GET', `/api/collection-reports-v2/sessions/${sessionId}`, 'Location access denied', user);
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 5: Build session detail response
    // ============================================================================
    const sessionData = await buildSessionDetailResponse(
      sessionId,
      machines
    );

    const duration = Date.now() - startTime;
    logRouteFetch(functionName, 'GET', `/api/collection-reports-v2/sessions/${sessionId}`, machines.length, user, duration);

    return NextResponse.json({ success: true, data: sessionData });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logRouteError(functionName, 'GET', `/api/collection-reports-v2/sessions/${sessionId}`, errorMessage, user);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// ============================================================================
// DELETE — Permanently delete a session (admin roles only)
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
    // ============================================================================
    // STEP 1: Connect, authenticate, and check permissions
    // ============================================================================
    await connectDB();
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roles } = extractUserPayload(
      userPayload as unknown as Record<string, unknown>
    );
    const canDelete =
      roles.includes('developer') ||
      roles.includes('owner') ||
      roles.includes('admin') ||
      roles.includes('location admin');

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete session' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse session ID and validate existence
    // ============================================================================
    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const existing = await ReportedMachine.findOne({ sessionId })
      .select('sessionStatus')
      .lean<ReportedMachineDocument>();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 3: Clean up Drive assets and fix supplemental meters
    // ============================================================================
    await deleteSessionDriveAssets(sessionId);
    await fixSupplementalMetersBeforeDelete(sessionId);

    // ============================================================================
    // STEP 4: Execute permanent delete
    // ============================================================================
    const deleteResult = await ReportedMachine.deleteMany({ sessionId });
    const count = deleteResult.deletedCount;
    await Meters.deleteMany({ locationSession: sessionId });

    const duration = Date.now() - startTime;
    logRouteDelete(functionName, 'DELETE', `/api/collection-reports-v2/sessions/${sessionId}`, count, user, duration);

    // ============================================================================
    // STEP 5: Return response
    // ============================================================================
    return NextResponse.json({
      success: true,
      data: { sessionId, count },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logRouteError(functionName, 'DELETE', `/api/collection-reports-v2/sessions/${sessionId}`, errorMessage, user);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// ============================================================================
// PATCH — Update session-level fields (start/end time)
// ============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/collection-reports-v2/sessions/[sessionId]';
  const user = extractUserFromRequest(req);
  let sessionId = '';

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
    // STEP 2: Parse request params and body
    // ============================================================================
    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { sessionStartTime, sessionEndTime } = body as {
      sessionStartTime?: string;
      sessionEndTime?: string;
    };

    // ============================================================================
    // STEP 3: Update session time fields
    // ============================================================================
    const updateFields: Record<string, unknown> = {};
    if (sessionStartTime) updateFields.sessionStartTime = new Date(sessionStartTime);
    if (sessionEndTime) updateFields.sessionEndTime = new Date(sessionEndTime);

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const result = await ReportedMachine.updateMany(
      { sessionId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    logRouteUpdate(functionName, 'PATCH', `/api/collection-reports-v2/sessions/${sessionId}`, result.modifiedCount, user, duration);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        machinesUpdated: result.modifiedCount,
        sessionStartTime: sessionStartTime || undefined,
        sessionEndTime: sessionEndTime || undefined,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logRouteError(functionName, 'PATCH', `/api/collection-reports-v2/sessions/${sessionId}`, errorMessage, user);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
