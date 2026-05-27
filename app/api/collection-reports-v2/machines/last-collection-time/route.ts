/**
 * Last Collection Time API Route (V2)
 *
 * Returns the sasEndTime of the most recent submitted collection session
 * for a given machine. Used by the V2 session detail page to pre-populate
 * chronological boundaries and check for middle-date captures.
 *
 * GET /api/collection-reports-v2/machines/last-collection-time?machineId=<id>
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/app/api/lib/utils/apiResponse';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Main GET handler for finding the last collection time in V2
 *
 * @param {string} machineId - REQUIRED. Query param: The MongoDB ID of the machine
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName =
    'GET /api/collection-reports-v2/machines/last-collection-time';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Parse request parameters
    // ============================================================================
    const { searchParams } = request.nextUrl;
    const machineId = searchParams.get('machineId');
    const excludeSessionId = searchParams.get('excludeSessionId');

    if (!machineId) {
      logRouteError(
        functionName,
        'GET',
        '/api/collection-reports-v2/machines/last-collection-time',
        'machineId query parameter is required',
        user
      );
      return createErrorResponse('machineId query parameter is required', 400);
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find most recent and oldest submitted session machines
    // ============================================================================
    const baseFilter: Record<string, unknown> = {
      machineId,
      sessionStatus: 'submitted',
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    if (excludeSessionId) {
      baseFilter.sessionId = { $ne: excludeSessionId };
    }

    // Find the most recent submitted collection for this machine,
    // ordered by sasEndTime descending so we get the latest gaming period end.
    const lastCollection = await ReportedMachine.findOne(baseFilter, {
      sasEndTime: 1,
      manualMetersIn: 1,
      manualMetersOut: 1,
    })
      .sort({ sasEndTime: -1 })
      .lean();

    // Find the oldest submitted collection to establish chronological boundaries
    const firstCollection = await ReportedMachine.findOne(baseFilter, {
      sasEndTime: 1,
    })
      .sort({ sasEndTime: 1 })
      .lean();

    let collectionTime: Date | null = lastCollection?.sasEndTime ?? null;
    let firstCollectionTime: Date | null = firstCollection?.sasEndTime ?? null;
    let metersIn: number | null = lastCollection?.manualMetersIn ?? null;
    let metersOut: number | null = lastCollection?.manualMetersOut ?? null;
    const hasPreviousCollection = !!lastCollection;

    // ============================================================================
    // STEP 4: Fallback to machine collectionMeters if no collection found
    // ============================================================================
    if (!lastCollection) {
      const { Machine } = await import('@/app/api/lib/models/machines');
      const machine = await Machine.findOne({ _id: machineId })
        .select('collectionTime collectionMeters')
        .lean<{
          collectionTime?: Date;
          collectionMeters?: { metersIn?: number; metersOut?: number };
        }>();
      if (machine) {
        collectionTime = machine.collectionTime ?? null;
        firstCollectionTime = machine.collectionTime ?? null;
        metersIn = machine.collectionMeters?.metersIn ?? null;
        metersOut = machine.collectionMeters?.metersOut ?? null;
      }
    }

    // ============================================================================
    // STEP 5: Return response
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/collection-reports-v2/machines/last-collection-time',
      lastCollection ? 1 : 0,
      user,
      duration
    );

    return createSuccessResponse(
      {
        collectionTime,
        firstCollectionTime,
        metersIn,
        metersOut,
        hasPreviousCollection,
      },
      lastCollection
        ? 'Last collection time found (V2)'
        : 'No previous submitted V2 collection found for this machine'
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/collection-reports-v2/machines/last-collection-time',
      message,
      user
    );
    return createErrorResponse(message, 500);
  }
}
