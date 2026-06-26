/**
 * @module app/api/sessions/[sessionId]/[machineId]/events/route
 *
 * Session Events API Route
 *
 * Fetches machine events scoped to a specific session and machine, with filtering,
 * time-range controls, pagination, and event-code cursor seek.
 *
 * Also returns unique filter values for eventType, description, and game dropdowns
 * in the same response so the UI can populate selects without extra requests.
 *
 * Flow:
 * 1. Parse path and query params
 * 2. Build the base match query (session + machine + active filters)
 * 3. Apply date range filtering
 * 4. If `command` param is provided, resolve the cursor page (seek to position)
 * 5. Run $facet aggregation: metadata count, paginated data, filter options
 * 6. Return events + pagination + filter options
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/sessions/[sessionId]/[machineId]/events
 *
 * Fetches paginated machine events filtered to a specific session and machine.
 * Supports narrowing by event category, log level, description text, game name,
 * date range (either an explicit window or a preset period), and event command code.
 *
 * URL params:
 * @param sessionId   {string} Required (path). The string `_id` of the session.
 * @param machineId   {string} Required (path). The string `_id` of the machine.
 *
 * Query params:
 * @param page        {number} Optional. 1-based page number (default: 1). Ignored when `command` is used for a cursor seek.
 * @param limit       {number} Optional. Number of events per page (default: 20).
 * @param timePeriod  {string} Optional. Preset: `Today`, `Yesterday`, `7d`, `30d`, `All Time`.
 * @param eventType   {string} Optional. Case-insensitive partial-match on `eventType` field.
 * @param type        {string} Optional. Case-insensitive match on `eventLogLevel` field.
 * @param event       {string} Optional. Case-insensitive partial-match on `description` field.
 * @param game        {string} Optional. Case-insensitive partial-match on `gameName`.
 * @param command     {string} Optional. Event code for cursor seek — resolves the page where the
 *                             first document with this command code appears and returns from that offset.
 * @param startDate   {string} Optional. ISO datetime for custom range start.
 * @param endDate     {string} Optional. ISO datetime for custom range end.
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
  const startTime = Date.now();
  const functionName = 'GET /api/sessions/[sessionId]/[machineId]/events';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const pathSegments = pathname.split('/').filter(Boolean);
  const machineId = pathSegments[pathSegments.length - 2];
  const sessionId = pathSegments[pathSegments.length - 3];

  try {
    // === STEP 1: Parse params ===

    const { searchParams } = new URL(request.url);
    const pageParam = parseInt(searchParams.get('page') || '1');
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const limitParam = parseInt(searchParams.get('limit') || '20');
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : 20;

    const timePeriod = searchParams.get('timePeriod');
    const eventType = searchParams.get('eventType');
    const eventLogLevel = searchParams.get('type');
    const eventDescription = searchParams.get('event');
    const game = searchParams.get('game');
    const command = searchParams.get('command');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // === STEP 2: Build base match query ===
    // machine and currentSession are stored as Strings in this collection
    const matchQuery: Record<string, unknown> = {
      machine: machineId as string,
      currentSession: sessionId as string,
    };

    if (eventType) {
      matchQuery.eventType = { $regex: eventType, $options: 'i' };
    }

    if (eventLogLevel) {
      if (eventLogLevel.toLowerCase() === 'warning') {
        matchQuery.eventLogLevel = {
          $in: ['Warning', 'WARN', 'warning', 'warn'],
        };
      } else {
        matchQuery.eventLogLevel = { $regex: eventLogLevel, $options: 'i' };
      }
    }

    if (eventDescription) {
      matchQuery.description = { $regex: eventDescription, $options: 'i' };
    }

    if (game) {
      matchQuery.gameName = { $regex: game, $options: 'i' };
    }

    // === STEP 3: Apply date range filtering ===
    if (startDateParam && endDateParam) {
      matchQuery.date = {
        $gte: new Date(startDateParam),
        $lte: new Date(endDateParam),
      };
    } else if (timePeriod && timePeriod !== 'All Time') {
      const tz = 'America/Port_of_Spain';
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      const parts = formatter.formatToParts(now);
      const year = parseInt(parts.find(p => p.type === 'year')!.value);
      const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
      const day = parseInt(parts.find(p => p.type === 'day')!.value);

      let dateStart: Date | null = null;
      let dateEnd: Date | null = null;

      switch (timePeriod) {
        case 'Today':
          dateStart = new Date(Date.UTC(year, month, day, 4, 0, 0, 0));
          dateEnd = new Date(Date.UTC(year, month, day + 1, 3, 59, 59, 999));
          break;
        case 'Yesterday':
          dateStart = new Date(Date.UTC(year, month, day - 1, 4, 0, 0, 0));
          dateEnd = new Date(Date.UTC(year, month, day, 3, 59, 59, 999));
          break;
        case '7d':
        case 'last7days':
          dateEnd = now;
          dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        case 'last30days':
          dateEnd = now;
          dateStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          break;
      }

      if (dateStart && dateEnd) {
        matchQuery.date = { $gte: dateStart, $lte: dateEnd };
      }
    }

    // === STEP 4: Resolve cursor page if command code is provided ===
    // Find the rank of the first document where command matches, then jump to that page.
    let resolvedPage = page;
    let cursorResolved = false;

    if (command) {
      const commandMatchQuery = {
        ...matchQuery,
        command: { $regex: `^${command}$`, $options: 'i' },
      };

      // Count how many documents appear before the first match (sorted by date desc)
      // We find the first document with this command, then count docs sorted before it.
      const firstMatch = await MachineEvent.findOne(commandMatchQuery)
        .sort({ date: -1 })
        .select('date _id')
        .lean<{ date: Date; _id: unknown }>();

      if (firstMatch) {
        // Count documents that come before this one in the sorted result set
        const rankQuery: Record<string, unknown> = {
          ...matchQuery,
          date: { $gt: firstMatch.date },
        };
        const rankCount =
          await MachineEvent.countDocuments(rankQuery);
        resolvedPage = Math.floor(rankCount / limit) + 1;
        cursorResolved = true;
      }
    }

    // === STEP 5: Run $facet aggregation ===
    const skip = (resolvedPage - 1) * limit;

    const pipeline: import('mongoose').PipelineStage[] = [
      { $match: matchQuery },
      { $sort: { date: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          eventTypes: [
            { $group: { _id: '$eventType' } },
            { $match: { _id: { $ne: null } } },
          ],
          eventLogLevels: [
            { $group: { _id: '$eventLogLevel' } },
            { $match: { _id: { $ne: null } } },
          ],
          descriptions: [
            { $group: { _id: '$description' } },
            { $match: { _id: { $ne: null } } },
            { $limit: 100 },
          ],
          games: [
            { $group: { _id: '$gameName' } },
            { $match: { _id: { $ne: null } } },
          ],
        },
      },
    ];

    const result = await MachineEvent.aggregate(pipeline);
    const facetData = result[0];
    const events = facetData.data;
    // hasMore: if a full batch came back, more records exist on the server
    const hasMore = events.length === limit;

    // === STEP 6: Return response ===
    const duration = Date.now() - startTime;
    if (duration > 1000) console.warn(`[${functionName}] slow: ${duration}ms`);
    logRouteFetch(
      functionName,
      'GET',
      '/api/sessions/[sessionId]/[machineId]/events',
      events.length,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: resolvedPage,
          hasMore,
          hasPrevPage: resolvedPage > 1,
          cursorResolved,
        },
        filters: {
          eventTypes: facetData.eventTypes
            .map((item: { _id: string }) => item._id)
            .filter(Boolean)
            .sort(),
          eventLogLevels: facetData.eventLogLevels
            .map((item: { _id: string }) => item._id)
            .filter(Boolean)
            .sort(),
          descriptions: facetData.descriptions
            .map((item: { _id: string }) => item._id)
            .filter(Boolean),
          games: facetData.games
            .map((item: { _id: string }) => item._id)
            .filter(Boolean)
            .sort(),
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/sessions/[sessionId]/[machineId]/events',
      errorMessage,
      user
    );
    console.error(
      `[SessionEvents API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
  });
}
