/**
 * Session Machine Events API Route
 *
 * This route handles fetching machine events for a specific session and machine.
 * It supports:
 * - Filtering by event type, event description, and game
 * - Date range filtering
 * - Licensee-based filtering through machine/location lookup
 * - Pagination
 * - Unique filter values for frontend dropdowns
 *
 * @module app/api/sessions/[sessionId]/[machineId]/events/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching session machine events
 *
 * Flow:
 * 1. Parse route parameters and query parameters
 * 2. Connect to database
 * 3. Build base query with session and machine filters
 * 4. Add event type, description, and game filters
 * 5. Add date range filters
 * 6. Handle licensee filtering with aggregation if needed
 * 7. Fetch events with pagination
 * 8. Get unique filter values
 * 9. Return paginated events with filter options
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; machineId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and query parameters
    // ============================================================================
    const { sessionId, machineId } = await params;

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const event = searchParams.get('event');
    const game = searchParams.get('game');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const filterDate = searchParams.get('filterDate');
    const licensee = searchParams.get('licensee');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // ============================================================================
    // STEP 3: Build base query with session and machine filters
    // ============================================================================
    const query: Record<string, unknown> = {
      machine: machineId,
    };

    // Only add session filter if sessionId is provided and valid
    if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
      query.currentSession = sessionId;
    }

    // ============================================================================
    // STEP 4: Add event type, description, and game filters
    // ============================================================================
    if (eventType) {
      query.eventType = { $regex: eventType, $options: 'i' };
    }

    if (event) {
      query.description = { $regex: event, $options: 'i' };
    }

    if (game) {
      query.gameName = { $regex: game, $options: 'i' };
    }

    // ============================================================================
    // STEP 5: Add date range filters
    // ============================================================================

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      query.date = {
        $gte: new Date(startDate),
      };
    } else if (endDate) {
      query.date = {
        $lte: new Date(endDate),
      };
    } else if (filterDate) {
      // Legacy support for filterDate
      query.date = {
        $gte: new Date(filterDate),
      };
    }

    // ============================================================================
    // STEP 6: Handle licensee filtering with aggregation if needed
    // ============================================================================
    let events;
    let totalEvents;

    if (licensee) {
      // ============================================================================
      // STEP 6.1: Use aggregation to join with machines and filter by licensee
      // ============================================================================
      // Use aggregation to join with machines and filter by licensee
      const aggregationPipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'machines',
            localField: 'machine',
            foreignField: '_id',
            as: 'machineDetails',
          },
        },
        {
          $unwind: '$machineDetails',
        },
        {
          $lookup: {
            from: 'gaminglocations',
            localField: 'machineDetails.gamingLocation',
            foreignField: '_id',
            as: 'locationDetails',
          },
        },
        {
          $unwind: '$locationDetails',
        },
        {
          $match: {
            'locationDetails.rel.licencee': licensee,
          },
        },
        {
          $sort: { date: -1 },
        },
        {
          $facet: {
            events: [{ $skip: (page - 1) * limit }, { $limit: limit }],
            totalCount: [{ $count: 'count' }],
          },
        },
      ];

      const result = await MachineEvent.aggregate(
        aggregationPipeline as PipelineStage[]
      );
      events = result[0]?.events || [];
      totalEvents = result[0]?.totalCount[0]?.count || 0;
    } else {
      // ============================================================================
      // STEP 6.2: No licensee filter, use simple query
      // ============================================================================
      totalEvents = await MachineEvent.countDocuments(query);
      events = await MachineEvent.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    // ============================================================================
    // STEP 7: Fetch events with pagination (already done above)
    // ============================================================================

    // ============================================================================
    // STEP 8: Get unique filter values
    // ============================================================================
    // Build filter query for distinct values
    const filterQuery: Record<string, unknown> = { machine: machineId };
    if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
      filterQuery.currentSession = sessionId;
    }

    // Add date filtering to filter query as well
    if (startDate && endDate) {
      filterQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filterQuery.date = {
        $gte: new Date(startDate),
      };
    } else if (endDate) {
      filterQuery.date = {
        $lte: new Date(endDate),
      };
    } else if (filterDate) {
      filterQuery.date = {
        $gte: new Date(filterDate),
      };
    }

    let eventTypes: string[], eventsList: string[], games: string[];

    if (licensee) {
      // ============================================================================
      // STEP 8.1: Use aggregation for licensee-filtered distinct values
      // ============================================================================
      // Use aggregation for licensee-filtered distinct values
      const filterAggregationPipeline = [
        { $match: filterQuery },
        {
          $lookup: {
            from: 'machines',
            localField: 'machine',
            foreignField: '_id',
            as: 'machineDetails',
          },
        },
        {
          $unwind: '$machineDetails',
        },
        {
          $lookup: {
            from: 'gaminglocations',
            localField: 'machineDetails.gamingLocation',
            foreignField: '_id',
            as: 'locationDetails',
          },
        },
        {
          $unwind: '$locationDetails',
        },
        {
          $match: {
            'locationDetails.rel.licencee': licensee,
          },
        },
      ];

      const [eventTypesResult, eventsListResult, gamesResult] =
        await Promise.all([
          MachineEvent.aggregate([
            ...filterAggregationPipeline,
            { $group: { _id: '$eventType' } },
          ] as PipelineStage[]),
          MachineEvent.aggregate([
            ...filterAggregationPipeline,
            { $group: { _id: '$description' } },
          ] as PipelineStage[]),
          MachineEvent.aggregate([
            ...filterAggregationPipeline,
            { $group: { _id: '$gameName' } },
          ] as PipelineStage[]),
        ]);

      eventTypes = eventTypesResult.map(item => item._id).filter(Boolean);
      eventsList = eventsListResult.map(item => item._id).filter(Boolean);
      games = gamesResult.map(item => item._id).filter(Boolean);
    } else {
      // ============================================================================
      // STEP 8.2: No licensee filter, use simple distinct queries
      // ============================================================================
      [eventTypes, eventsList, games] = await Promise.all([
        MachineEvent.distinct('eventType', filterQuery),
        MachineEvent.distinct('description', filterQuery),
        MachineEvent.distinct('gameName', filterQuery),
      ]);
    }

    // ============================================================================
    // STEP 9: Return paginated events with filter options
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Session Events API] Completed in ${duration}ms`);
    }
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
          eventTypes: eventTypes.filter(Boolean),
          events: eventsList.filter(Boolean),
          games: games.filter(Boolean),
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Session Machine Events API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
