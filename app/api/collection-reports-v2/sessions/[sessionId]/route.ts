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
import { CollectionSessionV2 } from '@/app/api/lib/models/collectionSessionV2';
import type { CollectionSessionV2Document } from '@/app/api/lib/models/collectionSessionV2';
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
import { revertMachineMetersAfterSessionDelete } from '@/app/api/lib/helpers/collectionReportV2/deleteOperations';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  getMoneyInScale,
  getMoneyOutAndJackpotScale,
} from '@/app/api/lib/utils/reviewerScale';
import type { SessionMachineResponse } from '@/app/api/lib/helpers/collectionReportV2/sessionOperations';

// ============================================================================
// Financial field names for PATCH parsing
// ============================================================================

const FINANCIAL_FIELDS = [
  'amountToCollect',
  'amountCollected',
  'amountUncollected',
  'previousBalance',
  'currentBalance',
  'partnerProfit',
  'taxes',
  'advance',
  'balanceCorrection',
  'balanceCorrectionReas',
  'variance',
  'varianceReason',
  'reasonShortagePayment',
  'locationProfitPerc',
  'includeJackpot',
] as const;

// ============================================================================
// Reviewer scale helpers
// ============================================================================

function applyScaleToMachine(
  machine: SessionMachineResponse,
  moneyInScale: number,
  moneyOutScale: number
): SessionMachineResponse {
  if (moneyInScale === 1 && moneyOutScale === 1) return machine;
  const round = (val: number | null): number | null =>
    val === null ? null : Math.round(val * 100) / 100;
  return {
    ...machine,
    sasMetersIn: round(machine.sasMetersIn !== null ? machine.sasMetersIn * moneyInScale : null),
    sasMetersOut: round(machine.sasMetersOut !== null ? machine.sasMetersOut * moneyOutScale : null),
    sasGross: round(machine.sasGross !== null ? machine.sasGross * moneyInScale : null),
    machineGross: Math.round(machine.machineGross * moneyInScale * 100) / 100,
    variation: round(machine.variation !== null ? machine.variation * moneyInScale : null),
  };
}

function applyScaleToFinancials(
  financials: CollectionSessionV2Document | null,
  moneyInScale: number,
  moneyOutScale: number
): CollectionSessionV2Document | null {
  if (!financials || (moneyInScale === 1 && moneyOutScale === 1)) return financials;
  const scaleIn = (val: number) => Math.round(val * moneyInScale * 100) / 100;
  const scaleOut = (val: number) => Math.round(val * moneyOutScale * 100) / 100;
  return {
    ...financials,
    amountToCollect: scaleIn(financials.amountToCollect ?? 0),
    amountCollected: scaleIn(financials.amountCollected ?? 0),
    amountUncollected: scaleIn(financials.amountUncollected ?? 0),
    partnerProfit: scaleIn(financials.partnerProfit ?? 0),
    variance: typeof financials.variance === 'number'
      ? scaleIn(financials.variance)
      : financials.variance,
    taxes: scaleOut(financials.taxes ?? 0),
    advance: scaleOut(financials.advance ?? 0),
    previousBalance: scaleOut(financials.previousBalance ?? 0),
    currentBalance: scaleOut(financials.currentBalance ?? 0),
    balanceCorrection: scaleOut(financials.balanceCorrection ?? 0),
  };
}

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
    // STEP 5: Build session detail response + fetch financials
    // ============================================================================
    const [sessionData, rawFinancials] = await Promise.all([
      buildSessionDetailResponse(sessionId, machines),
      CollectionSessionV2.findOne({ sessionId }).lean<CollectionSessionV2Document>(),
    ]);

    // ============================================================================
    // STEP 6: Apply reviewer scale (no-op for non-reviewer users)
    // ============================================================================
    const referenceDate = sessionData.sessionEndTime ?? new Date();
    const moneyInScale = getMoneyInScale(
      userPayload as Parameters<typeof getMoneyInScale>[0],
      referenceDate
    );
    const moneyOutScale = getMoneyOutAndJackpotScale(
      userPayload as Parameters<typeof getMoneyOutAndJackpotScale>[0],
      referenceDate
    );

    const scaledMachines = sessionData.machines.map(m =>
      applyScaleToMachine(m, moneyInScale, moneyOutScale)
    );
    const scaledFinancials = applyScaleToFinancials(rawFinancials, moneyInScale, moneyOutScale);

    const duration = Date.now() - startTime;
    logRouteFetch(functionName, 'GET', `/api/collection-reports-v2/sessions/${sessionId}`, machines.length, user, duration);

    return NextResponse.json({
      success: true,
      data: { ...sessionData, machines: scaledMachines, financials: scaledFinancials },
    });
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
    // STEP 3: Fetch machines before deletion for revert + logging
    // ============================================================================
    const sessionMachines = await ReportedMachine.find({ sessionId })
      .lean<import('@/app/api/lib/models/reportedMachines').ReportedMachineDocument[]>();
    const locationName = sessionMachines[0]?.locationName ?? sessionId;

    // ============================================================================
    // STEP 4: Clean up Drive assets, fix supplemental meters, revert machine state
    // ============================================================================
    await deleteSessionDriveAssets(sessionId);
    await fixSupplementalMetersBeforeDelete(sessionId);
    await revertMachineMetersAfterSessionDelete(sessionId, sessionMachines);

    // ============================================================================
    // STEP 5: Execute permanent delete
    // ============================================================================
    const deleteResult = await ReportedMachine.deleteMany({ sessionId });
    const count = deleteResult.deletedCount;
    await Meters.deleteMany({ locationSession: sessionId });

    // ============================================================================
    // STEP 6: Log activity
    // ============================================================================
    await logActivity({
      action: 'DELETE',
      details: `Deleted V2 collection session for ${locationName} (${count} machines)`,
      userId: String(userPayload._id),
      username: String(userPayload.emailAddress ?? userPayload._id),
      metadata: {
        userId: String(userPayload._id),
        userEmail: String(userPayload.emailAddress ?? ''),
        resource: 'collection-report-v2',
        resourceId: sessionId,
        resourceName: locationName,
        changes: [{ field: 'sessionId', oldValue: sessionId, newValue: null }],
      },
    }).catch(logError => {
      console.error('[DELETE session] Failed to log activity:', logError instanceof Error ? logError.message : 'Unknown error');
    });

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

    const body = await req.json() as Record<string, unknown>;
    const { sessionStartTime, sessionEndTime } = body as {
      sessionStartTime?: string;
      sessionEndTime?: string;
    };

    // ============================================================================
    // STEP 3: Update session time fields on ReportedMachine docs
    // ============================================================================
    const timeUpdateFields: Record<string, unknown> = {};
    if (sessionStartTime) timeUpdateFields.sessionStartTime = new Date(sessionStartTime);
    if (sessionEndTime) timeUpdateFields.sessionEndTime = new Date(sessionEndTime);

    let machinesUpdated = 0;
    if (Object.keys(timeUpdateFields).length > 0) {
      const result = await ReportedMachine.updateMany(
        { sessionId },
        { $set: timeUpdateFields }
      );
      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }
      machinesUpdated = result.modifiedCount;
    } else {
      const existingCount = await ReportedMachine.countDocuments({ sessionId });
      if (existingCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }
    }

    // ============================================================================
    // STEP 4: Upsert financial fields into CollectionSessionV2
    // ============================================================================
    const financialUpdate: Record<string, unknown> = {};
    for (const field of FINANCIAL_FIELDS) {
      if (field in body) financialUpdate[field] = body[field];
    }

    if (Object.keys(financialUpdate).length > 0) {
      const firstMachine = await ReportedMachine.findOne({ sessionId })
        .select('locationId licencee')
        .lean<{ locationId?: string; licencee?: string }>();

      await CollectionSessionV2.findOneAndUpdate(
        { sessionId },
        {
          $set: {
            ...financialUpdate,
            sessionId,
            locationId: firstMachine?.locationId ?? '',
            licencee: firstMachine?.licencee ?? '',
          },
        },
        { upsert: true }
      );
    }

    if (
      Object.keys(timeUpdateFields).length === 0 &&
      Object.keys(financialUpdate).length === 0
    ) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const duration = Date.now() - startTime;
    logRouteUpdate(functionName, 'PATCH', `/api/collection-reports-v2/sessions/${sessionId}`, machinesUpdated, user, duration);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        machinesUpdated,
        sessionStartTime: sessionStartTime || undefined,
        sessionEndTime: sessionEndTime || undefined,
        financialsUpdated: Object.keys(financialUpdate).length > 0,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logRouteError(functionName, 'PATCH', `/api/collection-reports-v2/sessions/${sessionId}`, errorMessage, user);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
