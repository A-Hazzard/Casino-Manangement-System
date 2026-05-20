/**
 * Last Collection Time API Route
 *
 * Returns the collectionTime of the most recent completed collection
 * for a given machine. Used by the new collection modal to pre-populate
 * the SAS start time (which should equal when the last gaming period ended).
 *
 * GET /api/collections/last-collection-time?machineId=<id>
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { Collections } from '@/app/api/lib/models/collections';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/app/api/lib/utils/apiResponse';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { CollectionDocument } from '@/lib/types/collection';
import { NextRequest } from 'next/server';

/**
 * Main GET handler for finding the last collection time
 *
 * @param {string} machineId - REQUIRED. Query param: The MongoDB ID of the machine
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName =
    'GET /api/collection-reports/collections/last-collection-time';
  const user = extractUserFromRequest(request);

  try {
    const { searchParams } = request.nextUrl;
    const machineId = searchParams.get('machineId');

    if (!machineId) {
      logRouteError(
        functionName,
        'GET',
        '/api/collection-reports/collections/last-collection-time',
        'machineId query parameter is required',
        user
      );
      return createErrorResponse('machineId query parameter is required', 400);
    }

    await connectDB();

    // Find the most recent completed collection for this machine,
    // ordered by collectionTime descending so we get the latest gaming period end.
    const lastCollection = await Collections.findOne(
      { machineId, isCompleted: true },
      { collectionTime: 1, metersIn: 1, metersOut: 1 }
    )
      .sort({ collectionTime: -1 })
      .lean<CollectionDocument | null>();

    let collectionTime: Date | null = lastCollection?.collectionTime ?? null;
    let metersIn: number | null = lastCollection?.metersIn ?? null;
    let metersOut: number | null = lastCollection?.metersOut ?? null;
    const hasPreviousCollection = !!lastCollection;

    if (!lastCollection) {
      const { Machine } = await import('@/app/api/lib/models/machines');
      const machine = await Machine.findOne({ _id: machineId })
        .select('collectionTime collectionMeters')
        .lean<{ collectionTime?: Date; collectionMeters?: { metersIn?: number; metersOut?: number } }>();
      if (machine) {
        collectionTime = machine.collectionTime ?? null;
        metersIn = machine.collectionMeters?.metersIn ?? null;
        metersOut = machine.collectionMeters?.metersOut ?? null;
      }
    }

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/collection-reports/collections/last-collection-time',
      lastCollection ? 1 : 0,
      user,
      duration
    );

    return createSuccessResponse(
      {
        collectionTime,
        metersIn,
        metersOut,
        hasPreviousCollection,
      },
      lastCollection
        ? 'Last collection time found'
        : 'No previous completed collection found for this machine'
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/collection-reports/collections/last-collection-time',
      message,
      user
    );
    return createErrorResponse(message, 500);
  }
}
