/**
 * Cabinet Transfer Meters API Route
 *
 * Owner/admin/developer endpoint to backfill meter.location values when a
 * cabinet's gamingLocation has changed but historical meters still reference
 * the old location.
 *
 * @module app/api/cabinets/[cabinetId]/transfer-meters/route
 *
 * Features:
 * - GET: transfer stats (x/y), eligible count, default from/to datetimes
 * - POST: batch-update mismatched meters (fromDateTime <= readAt <= toDateTime)
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  getTransferMetersStats,
  hasTransferMetersAdminAccess,
  transferMetersBatch,
} from '@/app/api/lib/helpers/cabinets/transferMetersOperations';
import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import {
  extractUserFromRequest,
  logRouteError,
  logRouteFetch,
  logRouteUpdate,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

function isOperationError(
  result: unknown
): result is { success: false; error: string; status: number } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    (result as { success: boolean }).success === false
  );
}

/**
 * GET /api/cabinets/[cabinetId]/transfer-meters
 *
 * Flow:
 * 1. Authenticate and enforce admin role
 * 2. Load machine and verify location access
 * 3. Return meter transfer stats and default from-datetime
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'GET /api/cabinets/[cabinetId]/transfer-meters';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ userRoles }) => {
    try {
      if (!hasTransferMetersAdminAccess(userRoles)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const { cabinetId } = await params;
      if (!cabinetId) {
        return NextResponse.json(
          { success: false, error: 'cabinetId required' },
          { status: 400 }
        );
      }

      await connectDB();

      const machine = await Machine.findOne({ _id: cabinetId }).lean<{
        gamingLocation?: string;
      }>();
      if (!machine?.gamingLocation) {
        return NextResponse.json(
          { success: false, error: 'Cabinet not found or missing location' },
          { status: 404 }
        );
      }

      const hasAccess = await checkUserLocationAccess(machine.gamingLocation);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const { searchParams } = new URL(request.url);
      const fromDateTime = searchParams.get('fromDateTime') ?? undefined;
      const toDateTime = searchParams.get('toDateTime') ?? undefined;

      const result = await getTransferMetersStats(
        cabinetId,
        fromDateTime,
        toDateTime
      );
      if (isOperationError(result)) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status }
        );
      }

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[${functionName}] Slow request: ${duration}ms`);
      }

      logRouteFetch(functionName, 'GET', '/api/cabinets/[cabinetId]/transfer-meters', 1, user, duration);
      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logRouteError(
        functionName,
        'GET',
        '/api/cabinets/[cabinetId]/transfer-meters',
        message,
        user
      );
      console.error(`[${functionName}] Error:`, message);
      return NextResponse.json(
        { success: false, error: 'Failed to load transfer meters stats' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/cabinets/[cabinetId]/transfer-meters
 *
 * Flow:
 * 1. Authenticate and enforce admin role
 * 2. Validate body (fromDateTime, optional batch cursor)
 * 3. Verify location access
 * 4. Batch-update mismatched meter locations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'POST /api/cabinets/[cabinetId]/transfer-meters';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ userRoles, user: currentUser }) => {
    try {
      if (!hasTransferMetersAdminAccess(userRoles)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const { cabinetId } = await params;
      if (!cabinetId) {
        return NextResponse.json(
          { success: false, error: 'cabinetId required' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const fromDateTime =
        typeof body.fromDateTime === 'string' ? body.fromDateTime : '';
      const toDateTime =
        typeof body.toDateTime === 'string' ? body.toDateTime : '';
      if (!fromDateTime || !toDateTime) {
        return NextResponse.json(
          { success: false, error: 'fromDateTime and toDateTime are required' },
          { status: 400 }
        );
      }

      const batchSize =
        typeof body.batchSize === 'number' ? body.batchSize : undefined;
      const concurrency =
        typeof body.concurrency === 'number' ? body.concurrency : undefined;
      const activityTotal =
        typeof body.activityTotal === 'number' ? body.activityTotal : undefined;
      const logActivity =
        typeof body.logActivity === 'boolean' ? body.logActivity : undefined;
      const cursor =
        typeof body.cursor === 'string' ? body.cursor : undefined;

      await connectDB();

      const machine = await Machine.findOne({ _id: cabinetId }).lean<{
        gamingLocation?: string;
      }>();
      if (!machine?.gamingLocation) {
        return NextResponse.json(
          { success: false, error: 'Cabinet not found or missing location' },
          { status: 404 }
        );
      }

      const hasAccess = await checkUserLocationAccess(machine.gamingLocation);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const result = await transferMetersBatch(
        cabinetId,
        fromDateTime,
        toDateTime,
        {
          batchSize,
          concurrency,
          cursor,
          activityTotal,
          logActivity,
          request,
          userId: currentUser._id,
          username: currentUser.emailAddress ?? currentUser._id,
        }
      );

      if (isOperationError(result)) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status }
        );
      }

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[${functionName}] Slow request: ${duration}ms`);
      }

      logRouteUpdate(
        functionName,
        'POST',
        '/api/cabinets/[cabinetId]/transfer-meters',
        result.updated,
        user,
        duration
      );

      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logRouteError(
        functionName,
        'POST',
        '/api/cabinets/[cabinetId]/transfer-meters',
        message,
        user
      );
      console.error(`[${functionName}] Error:`, message);
      return NextResponse.json(
        { success: false, error: 'Failed to transfer meters' },
        { status: 500 }
      );
    }
  });
}
