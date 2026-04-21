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
import { createSuccessResponse, createErrorResponse } from '@/app/api/lib/utils/apiResponse';
import { NextRequest } from 'next/server';
 
/**
 * Main GET handler for finding the last collection time
 *
 * @param {string} machineId - REQUIRED. Query param: The MongoDB ID of the machine
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const machineId = searchParams.get('machineId');

    if (!machineId) {
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
      .lean();

    return createSuccessResponse(
      { 
        collectionTime: lastCollection?.collectionTime ?? null,
        metersIn: lastCollection?.metersIn ?? null,
        metersOut: lastCollection?.metersOut ?? null,
        hasPreviousCollection: !!lastCollection
      },
      lastCollection
        ? 'Last collection time found'
        : 'No previous completed collection found for this machine',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(message, 500);
  }
}
