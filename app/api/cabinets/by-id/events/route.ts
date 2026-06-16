/**
 * Machine Events API Route
 *
 * Fetches paginated machine events by machine ID with full filtering support,
 * server-side pagination, and event-code cursor seek.
 *
 * Also returns available filter options (eventTypes, games) alongside events
 * so the UI can populate dropdowns without extra requests.
 *
 * @module app/api/cabinets/by-id/events/route
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters
 * 3. Validate machine ID
 * 4. Apply technician restriction (force LastHour)
 * 5. Build base match query with all active filters
 * 6. Calculate date range from time period or custom range
 * 7. If `command` is provided, resolve cursor page (seek to position)
 * 8. Query events with pagination via $facet (data + metadata + filter options)
 * 9. Try alternative machine identifiers if no events found
 * 10. Return events with pagination metadata and filter options
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import { Machine } from '@/app/api/lib/models/machines';
import type { GamingMachine, MachineEventDocument } from '@shared/types';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/cabinets/by-id/events
 *
 * @param {string} id - ID of the machine to fetch events for
 * @param {string} eventType - Filter by event category name (regex, case-insensitive)
 * @param {string} type - Filter by log level ('Warning', 'Error', 'Info')
 * @param {string} event - Search query for event description (regex)
 * @param {string} game - Filter by game name (regex)
 * @param {string} command - Event code for cursor seek
 * @param {string} timePeriod - Time range preset ('Today', 'Yesterday', '7d', '30d', 'All Time', 'LastHour')
 * @param {string} startDate - ISO date for custom range start
 * @param {string} endDate - ISO date for custom range end
 * @param {number} page - Page number for pagination (1-based, default: 1)
 * @param {number} limit - Items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/cabinets/by-id/events';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('id');
    const eventType = searchParams.get('eventType');
    const type = searchParams.get('type');
    const event = searchParams.get('event');
    const game = searchParams.get('game');
    const command = searchParams.get('command');
    let timePeriod = searchParams.get('timePeriod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 20;

    // ============================================================================
    // STEP 3: Validate machine ID parameter
    // ============================================================================
    if (!machineId) {
      logRouteError(
        functionName,
        'GET',
        '/api/cabinets/by-id/events',
        'Machine ID is required',
        user
      );
      return NextResponse.json(
        { error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Technician Restriction - Force last hour data
    // ============================================================================
    const { getUserFromServer } =
      await import('@/app/api/lib/helpers/users/users');
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];

    const isAdmin = userRoles
      .map(r => r?.toLowerCase?.() ?? r)
      .some(r => r === 'admin' || r === 'developer');
    const userRolesLower = userRoles.map(r => r.toLowerCase());
    const isOnlyTechnician =
      userRolesLower.includes('technician') &&
      !userRolesLower.some(r =>
        ['admin', 'developer', 'manager', 'location admin'].includes(r)
      );

    if (isOnlyTechnician && !isAdmin) {
      console.warn(
        '[API Events] Applying technician restriction: forcing LastHour timePeriod'
      );
      timePeriod = 'LastHour';
    }

    // ============================================================================
    // STEP 5: Build base match query with filters
    // ============================================================================
    const baseQuery: Record<string, unknown> = { machine: machineId };

    if (eventType) {
      baseQuery['eventType'] = { $regex: eventType, $options: 'i' } as unknown;
    }

    if (type) {
      if (type.toLowerCase() === 'warning') {
        baseQuery['eventLogLevel'] = {
          $in: ['Warning', 'WARN', 'warning', 'warn'],
        } as unknown;
      } else {
        baseQuery['eventLogLevel'] = {
          $regex: type,
          $options: 'i',
        } as unknown;
      }
    }

    if (event) {
      baseQuery['description'] = { $regex: event, $options: 'i' } as unknown;
    }

    if (game) {
      baseQuery['gameName'] = { $regex: game, $options: 'i' } as unknown;
    }

    // ============================================================================
    // STEP 6: Calculate date range
    // ============================================================================
    let dateFilterStart: Date | null = null;
    let dateFilterEnd: Date | null = null;

    if (startDate && endDate) {
      dateFilterStart = new Date(startDate);
      dateFilterEnd = new Date(endDate);
    } else if (timePeriod && timePeriod !== 'All Time') {
      const tz = 'America/Port_of_Spain';
      const now = new Date();

      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      const dateParts = formatter.formatToParts(now);
      const year = parseInt(dateParts.find(p => p.type === 'year')!.value);
      const month =
        parseInt(dateParts.find(p => p.type === 'month')!.value) - 1;
      const day = parseInt(dateParts.find(p => p.type === 'day')!.value);

      switch (timePeriod) {
        case 'Today':
          dateFilterStart = new Date(Date.UTC(year, month, day, 4, 0, 0, 0));
          dateFilterEnd = new Date(
            Date.UTC(year, month, day + 1, 3, 59, 59, 999)
          );
          break;
        case 'Yesterday':
          dateFilterStart = new Date(
            Date.UTC(year, month, day - 1, 4, 0, 0, 0)
          );
          dateFilterEnd = new Date(Date.UTC(year, month, day, 3, 59, 59, 999));
          break;
        case '7d':
          dateFilterEnd = now;
          dateFilterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFilterEnd = now;
          dateFilterStart = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          );
          break;
        case 'LastHour':
          dateFilterEnd = now;
          dateFilterStart = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        default:
          break;
      }
    }

    if (dateFilterStart && dateFilterEnd) {
      baseQuery['date'] = {
        $gte: dateFilterStart,
        $lte: dateFilterEnd,
      } as unknown;
    }

    // ============================================================================
    // STEP 7: Resolve cursor page if event command code provided
    // ============================================================================
    // Find the rank (0-based global position) of the Nth match for `command`,
    // then seek to the exact batch + display page that contains it — same
    // technique as the meters search (metersSearch.ts).
    const matchOrdinal = Math.max(0, parseInt(searchParams.get('matchOrdinal') || '0'));
    let resolvedPage = page;
    let cursorResolved = false;
    let matchCount = 0;
    let matchIndex = -1;

    if (command) {
      const commandMatchQuery = {
        ...baseQuery,
        command: { $regex: `^${command}$`, $options: 'i' },
      };

      // One pass: total match count + the Nth match.
      type MatchFacetResult = {
        total: { n: number }[];
        nth: { _id: unknown; date: Date }[];
      };

      const matchFacet = await MachineEvent.aggregate<MatchFacetResult>([
        { $match: commandMatchQuery },
        { $sort: { date: -1, _id: -1 } },
        {
          $facet: {
            total: [{ $count: 'n' }],
            nth: [
              { $skip: matchOrdinal },
              { $limit: 1 },
              { $project: { _id: 1, date: 1 } },
            ],
          },
        },
      ]).exec();

      matchCount = matchFacet[0]?.total?.[0]?.n ?? 0;
      const nthMatch = matchFacet[0]?.nth?.[0];

      if (nthMatch) {
        // Count events that sort before the Nth match (its 0-based global rank).
        // $expr with _id tiebreaker avoids driver-level ObjectId typing issues.
        const rankCount = await MachineEvent.countDocuments({
          ...baseQuery,
          $expr: {
            $or: [
              { $gt: ['$date', nthMatch.date] },
              {
                $and: [
                  { $eq: ['$date', nthMatch.date] },
                  { $gt: ['$_id', nthMatch._id] },
                ],
              },
            ],
          },
        });
        matchIndex = rankCount;
        resolvedPage = Math.floor(rankCount / limit) + 1;
        cursorResolved = true;
      }
    }

    const skip = (resolvedPage - 1) * limit;

    // ============================================================================
    // STEP 8: Query events — fast path for All Time, facet path for date-bounded
    //
    // All Time (no date filter): skip the expensive $count and $group aggregations
    // that would scan every matching document. Instead fetch limit+1 rows via the
    // machine+date index, derive hasNextPage from the extra row, and return
    // totalEvents/totalPages as null so the UI shows unbounded pagination.
    //
    // Date-bounded: the date range keeps the matching set small, so the full
    // $facet (count + filter-option groups) stays fast.
    // ============================================================================
    const isAllTime = !dateFilterStart && !dateFilterEnd;

    let events: MachineEventDocument[] = [];
    let totalEvents: number | null = null;
    let allTimeHasNextPage = false;

    type FacetItem = { _id: string | null };
    type FacetResult = {
      metadata: [{ total: number }] | [];
      data: MachineEventDocument[];
      eventTypes: FacetItem[];
      eventLogLevels: FacetItem[];
      games: FacetItem[];
    };

    let filterOptions = {
      eventTypes: [] as string[],
      eventLogLevels: [] as string[],
      games: [] as string[],
    };

    if (isAllTime) {
      // Fetch one extra doc to detect whether a next page exists.
      const rawEvents = await MachineEvent.find(baseQuery)
        .sort({ date: -1, _id: -1 })
        .skip(skip)
        .limit(limit + 1)
        .lean<MachineEventDocument[]>();

      allTimeHasNextPage = rawEvents.length > limit;
      events = allTimeHasNextPage ? rawEvents.slice(0, limit) : rawEvents;

      // Derive filter options from the current page — avoids a full-collection scan.
      filterOptions = {
        eventTypes: [...new Set(events.map(e => e.eventType).filter((v): v is string => Boolean(v)))].sort(),
        eventLogLevels: [...new Set(events.map(e => e.eventLogLevel).filter((v): v is string => Boolean(v)))].sort(),
        games: [...new Set(events.map(e => e.gameName).filter((v): v is string => Boolean(v)))].sort(),
      };
    } else {
      const facetPipeline: import('mongoose').PipelineStage[] = [
        { $match: baseQuery },
        { $sort: { date: -1, _id: -1 } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $skip: skip }, { $limit: limit }],
            eventTypes: [
              { $group: { _id: '$eventType' } },
              { $match: { _id: { $ne: null } } },
            ],
            eventLogLevels: [
              { $group: { _id: '$eventLogLevel' } },
              { $match: { _id: { $ne: null } } },
            ],
            games: [
              { $group: { _id: '$gameName' } },
              { $match: { _id: { $ne: null } } },
            ],
          },
        },
      ];

      const facetResult = await MachineEvent.aggregate<FacetResult>(facetPipeline);
      const facetData = facetResult[0];

      events = facetData?.data ?? [];
      totalEvents = facetData?.metadata[0]?.total ?? 0;
      filterOptions = {
        eventTypes: (facetData?.eventTypes ?? []).map(i => i._id).filter((v): v is string => Boolean(v)).sort(),
        eventLogLevels: (facetData?.eventLogLevels ?? []).map(i => i._id).filter((v): v is string => Boolean(v)).sort(),
        games: (facetData?.games ?? []).map(i => i._id).filter((v): v is string => Boolean(v)).sort(),
      };
    }

    // ============================================================================
    // STEP 9: Try alternative machine identifiers if no events found
    // ============================================================================
    if (events.length === 0) {
      const machineDoc = await Machine.findOne({ _id: machineId })
        .select('machineId relayId serialNumber')
        .lean<GamingMachine>();

      if (machineDoc) {
        const alternativeQueries = [
          { machineId: machineDoc.machineId },
          { relay: machineDoc.relayId },
          { cabinetId: machineDoc.serialNumber },
        ].filter(q => Object.values(q)[0]);

        for (const altQuery of alternativeQueries) {
          const combinedQuery = { ...baseQuery, ...altQuery };
          const altEvents = await MachineEvent.find(combinedQuery)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean<MachineEventDocument[]>();

          if (altEvents.length > 0) {
            events = altEvents;
            break;
          }
        }
      }
    }

    // ============================================================================
    // STEP 10: Return events with pagination metadata and filter options
    //
    // For All Time queries totalEvents/totalPages are null — the client renders
    // unbounded pagination (no "of Y" total, no last-page button).
    // ============================================================================
    const totalPages = totalEvents !== null ? Math.ceil(totalEvents / limit) : null;
    const hasNextPage = totalPages !== null
      ? resolvedPage < totalPages
      : allTimeHasNextPage;

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Machines By ID Events API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      events,
      pagination: {
        currentPage: resolvedPage,
        totalPages,
        totalEvents,
        hasNextPage,
        hasPrevPage: resolvedPage > 1,
        cursorResolved,
        matchCount,
        matchIndex,
      },
      filters: filterOptions,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/cabinets/by-id/events',
      errorMessage,
      user
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
