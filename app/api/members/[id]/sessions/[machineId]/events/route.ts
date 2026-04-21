/**
 * Member Machine Events API Route
 *
 * This route handles fetching machine events for a specific member and machine.
 * It supports:
 * - Filtering by event type, event description, and game
 * - Pagination
 * - Optimized queries with indexing considerations
 * - Unique filter values for frontend dropdowns
 *
 * @module app/api/members/[id]/sessions/[machineId]/events/route
 */

import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/members/[id]/sessions/[machineId]/events
 *
 * Fetches paginated machine events for a specific machine, scoped to the member's
 * context. Also returns the full set of unique `eventType`, description, and game
 * values so the frontend can populate filter dropdowns without a separate request.
 *
 * URL params:
 * @param machineId   {string} Required (path). The string `_id` of the machine whose events are fetched.
 *
 * Query params:
 * @param eventType   {string} Optional. Exact match filter on the event's `eventType` field
 *                             (e.g. `"GAME_EVENT"`, `"CASH_EVENT"`).
 * @param event       {string} Optional. Case-insensitive partial-match filter on the event `description`
 *                             field (applied as a regex).
 * @param game        {string} Optional. Case-insensitive partial-match filter on `gameName`
 *                             (applied as a regex).
 * @param page        {number} Optional. 1-based page number (default: 1).
 * @param limit       {number} Optional. Number of events per page (default: 10).
 */
export async function GET(
  request: NextRequest
) {
  const startTime = Date.now();

  try {
    const { pathname, searchParams } = request.nextUrl;
    const parts = pathname.split('/');
    const machineId = parts[parts.length - 2];
    // id is not used in this route, so we don't need to extract it

    const eventType = searchParams.get('eventType');
    const event = searchParams.get('event');
    const game = searchParams.get('game');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    await connectDB();

    // ============================================================================
    // STEP 3: Build query with filters
    // ============================================================================
    const query: Record<string, unknown> = { machine: machineId };

    if (eventType) {
      query.eventType = eventType;
    }

    if (event) {
      query.description = { $regex: event, $options: 'i' };
    }

    if (game) {
      query.gameName = { $regex: game, $options: 'i' };
    }

    // ============================================================================
    // STEP 4: Fetch events with pagination
    // ============================================================================
    const skip = (page - 1) * limit;

    const events = await MachineEvent.find(query)
      .select({
        _id: 1,
        eventType: 1,
        description: 1,
        command: 1,
        gameName: 1,
        date: 1,
        eventLogLevel: 1,
        eventSuccess: 1,
        sequence: 1,
      })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ============================================================================
    // STEP 5: Get total count for pagination
    // ============================================================================
    const totalEvents = await MachineEvent.countDocuments(query);

    // ============================================================================
    // STEP 6: Get unique filter values using aggregation
    // ============================================================================
    const filterPipeline = [
      { $match: { machine: machineId } },
      {
        $group: {
          _id: null,
          eventTypes: { $addToSet: '$eventType' },
          events: { $addToSet: '$description' },
          games: { $addToSet: '$gameName' },
        },
      },
      {
        $project: {
          eventTypes: {
            $filter: { input: '$eventTypes', cond: { $ne: ['$$this', null] } },
          },
          events: {
            $filter: { input: '$events', cond: { $ne: ['$$this', null] } },
          },
          games: {
            $filter: { input: '$games', cond: { $ne: ['$$this', null] } },
          },
        },
      },
    ];

    const filterResults = await MachineEvent.aggregate(filterPipeline);

    const uniqueEventTypes = filterResults[0]?.eventTypes || [];
    const uniqueEvents = filterResults[0]?.events || [];
    const uniqueGames = filterResults[0]?.games || [];

    // ============================================================================
    // STEP 7: Return paginated events with filter options
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Member Sessions Events API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalEvents / limit),
          totalEvents,
          hasNextPage: page * limit < totalEvents,
          hasPrevPage: page > 1,
        },
        filters: {
          eventTypes: uniqueEventTypes.sort(),
          events: uniqueEvents.sort(),
          games: uniqueGames.sort(),
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch machine events';
    console.error(
      `[Member Machine Events API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
