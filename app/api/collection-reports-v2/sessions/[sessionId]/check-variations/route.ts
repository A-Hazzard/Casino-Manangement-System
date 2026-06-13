/**
 * Collection Report V2 — Session Variation Checker
 *
 * GET /api/collection-reports-v2/sessions/[sessionId]/check-variations
 *
 * Compares each SMIB machine's movement.machineGross against the aggregated
 * SAS gross from Meter documents within the machine's sasStartTime/sasEndTime
 * window. Returns per-machine variation and a session total.
 *
 * Features:
 * - Excludes no-SMIB machines (sasMetersIn null) and skipped machines
 * - Applies licencee includeJackpot flag to SAS gross
 * - Cursor-based Meters aggregation (batchSize 1000) for performance
 *
 * @module app/api/collection-reports-v2/sessions/[sessionId]/check-variations/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import {
  extractUserFromRequest,
  logRouteFetch,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import {
  extractUserPayload,
  verifySessionLocationAccess,
} from '@/app/api/lib/helpers/collectionReportV2/sessionOperations';
import { checkSessionVariations } from '@/app/api/lib/helpers/collectionReportV2/variationChecker';
import { NextRequest, NextResponse } from 'next/server';
import type { ReportedMachineDocument } from '@/app/api/lib/models/reportedMachines';

// ============================================================================
// GET — Check session variations
// ============================================================================

/**
 * Flow:
 *   1. Authenticate user and parse sessionId.
 *   2. Fetch all ReportedMachine docs for the session.
 *   3. Verify location access.
 *   4. Compute per-machine variation vs SAS gross.
 *   5. Return variation result.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'GET /api/collection-reports-v2/sessions/[sessionId]/check-variations';
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
    const machines = await ReportedMachine.find({
      sessionId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
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
      logRouteError(functionName, 'GET', `/api/collection-reports-v2/sessions/${sessionId}/check-variations`, 'Location access denied', user);
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 5: Compute variations
    // ============================================================================
    const licenceeId = String(machines[0].licencee ?? '');
    const variationResult = await checkSessionVariations(machines, licenceeId);

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[${functionName}] Slow response: ${duration}ms`);
    }
    logRouteFetch(functionName, 'GET', `/api/collection-reports-v2/sessions/${sessionId}/check-variations`, variationResult.machines.length, user, duration);

    return NextResponse.json({ success: true, data: variationResult });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logRouteError(functionName, 'GET', `/api/collection-reports-v2/sessions/${sessionId}/check-variations`, errorMessage, user);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
