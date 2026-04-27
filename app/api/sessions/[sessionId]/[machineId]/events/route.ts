/**
 * Session Events API Route
 *
 * Fetches machine events scoped to a specific session and machine, with filtering,
 * time-range controls, and pagination. Also returns unique filter values for
 * eventType, description, and game dropdowns in the same response.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/sessions/[sessionId]/[machineId]/events
 *
 * Fetches paginated machine events filtered to a specific session and machine.
 * Supports narrowing by event category, description text, game name, and date range
 * (either an explicit window or a preset period). Returns available filter options
 * alongside the events so the UI can populate dropdowns without extra requests.
 *
 * URL params:
 * @param sessionId   {string} Required (path). The string `_id` of the session to scope events to.
 * @param machineId   {string} Required (path). The string `_id` of the machine to scope events to.
 *
 * Query params:
 * @param page        {number} Optional. 1-based page number (default: 1).
 * @param limit       {number} Optional. Number of events per page (default: 10).
 * @param timePeriod  {string} Optional. Preset time window: `today`, `yesterday`, `7d` / `last7days`,
 *                             `30d` / `last30days`, or `All Time` (no filter). Ignored when
 *                             `startDate`/`endDate` are provided.
 * @param eventType   {string} Optional. Case-insensitive partial-match filter on the event's
 *                             `eventType` field (e.g. `"GAME_EVENT"`).
 * @param event       {string} Optional. Case-insensitive partial-match filter on the event
 *                             `description` field.
 * @param game        {string} Optional. Case-insensitive partial-match filter on `gameName`.
 * @param startDate   {string} Optional. ISO datetime string for the start of a custom date range.
 *                             Must be paired with `endDate`; filters `date >= startDate`.
 * @param endDate     {string} Optional. ISO datetime string for the end of a custom date range.
 *                             Must be paired with `startDate`; filters `date <= endDate`.
 */
export async function GET(
  request: NextRequest
) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const parts = pathname.split('/');
  const machineId = parts[parts.length - 2];
  const sessionId = parts[parts.length - 3];

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const timePeriod = searchParams.get('timePeriod');
    const eventType = searchParams.get('eventType');
    const eventDescription = searchParams.get('event');
    const game = searchParams.get('game');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Build Match Query
    // In our system, machine and currentSession are stored as Strings.
    const matchQuery: Record<string, unknown> = {
      machine: machineId as string,
      currentSession: sessionId as string,
    };

    if (eventType) {
      matchQuery.eventType = { $regex: eventType, $options: 'i' };
    }

    if (eventDescription) {
      matchQuery.description = { $regex: eventDescription, $options: 'i' };
    }

    if (game) {
      matchQuery.gameName = { $regex: game, $options: 'i' };
    }

    // Handle Time Filtering
    if (startDateParam && endDateParam) {
      matchQuery.date = {
        $gte: new Date(startDateParam),
        $lte: new Date(endDateParam),
      };
    } else if (timePeriod && timePeriod !== 'All Time') {
      let startDate: Date | null = null;
      let endDate = new Date(); // now

      switch (timePeriod.toLowerCase()) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case '7d':
        case 'last7days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
        case 'last30days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      if (startDate) {
        matchQuery.date = { $gte: startDate, $lte: endDate };
      }
    }

    // Aggregation pipeline
    const pipeline: import('mongoose').PipelineStage[] = [
      { $match: matchQuery },
      { $sort: { date: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          eventTypes: [{ $group: { _id: '$eventType' } }],
          events: [{ $group: { _id: '$description' } }, { $limit: 100 }],
        },
      },
    ];

    const result = await MachineEvent.aggregate(pipeline);

    const data = result[0];
    const totalEvents = data.metadata[0]?.total || 0;
    const events = data.data;

    // Get unique game names for filters
    const games = await MachineEvent.distinct('gameName', matchQuery);

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalEvents / limit),
          totalEvents,
          hasNextPage: page < Math.ceil(totalEvents / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          eventTypes: data.eventTypes.map((eventItem: { _id: string }) => eventItem._id).filter(Boolean),
          events: data.events.map((eventItem: { _id: string }) => eventItem._id).filter(Boolean),
          games: games.filter(Boolean),
        },
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[SessionEvents API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
