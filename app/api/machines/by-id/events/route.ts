import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import { Machine } from '@/app/api/lib/models/machines';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('id');
    const eventType = searchParams.get('eventType');
    const event = searchParams.get('event');
    const game = searchParams.get('game');
    const timePeriod = searchParams.get('timePeriod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 20)
        : 20;

    if (!machineId) {
      return NextResponse.json(
        { error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    // Build the base query with machine ID
    const baseQuery: Record<string, unknown> = { machine: machineId };

    // Add other filters to the query
    if (eventType) {
      baseQuery['eventType'] = { $regex: eventType, $options: 'i' } as unknown;
    }

    if (event) {
      baseQuery['description'] = { $regex: event, $options: 'i' } as unknown;
    }

    if (game) {
      baseQuery['gameName'] = { $regex: game, $options: 'i' } as unknown;
    }

    // Apply date filtering if provided
    let dateFilterStart: Date | null = null;
    let dateFilterEnd: Date | null = null;

    // Handle custom date range (startDate and endDate parameters)
    if (startDate && endDate) {
      dateFilterStart = new Date(startDate);
      dateFilterEnd = new Date(endDate);
    }
    // Handle predefined time periods
    else if (timePeriod && timePeriod !== 'All Time') {
      // Use the same timezone-aware approach as the main API
      const tz = 'America/Port_of_Spain';
      const now = new Date();

      switch (timePeriod) {
        case 'Today':
          dateFilterStart = new Date(
            now.toLocaleDateString('en-CA', { timeZone: tz }) + 'T00:00:00.000Z'
          );
          dateFilterEnd = new Date(
            dateFilterStart.getTime() + 24 * 60 * 60 * 1000 - 1
          );
          break;
        case 'Yesterday':
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          dateFilterStart = new Date(
            yesterday.toLocaleDateString('en-CA', { timeZone: tz }) +
              'T00:00:00.000Z'
          );
          dateFilterEnd = new Date(
            dateFilterStart.getTime() + 24 * 60 * 60 * 1000 - 1
          );
          break;
        case '7d':
          dateFilterEnd = now;
          dateFilterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFilterEnd = now;
          dateFilterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          // No time filtering - return all events
          break;
      }
    }

    // Only add date filter if we have valid start and end dates
    if (dateFilterStart && dateFilterEnd) {
      baseQuery['date'] = {
        $gte: dateFilterStart,
        $lte: dateFilterEnd,
      } as unknown;
    }

    // Try to find events with the base query
    let events = await MachineEvent.find(baseQuery)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // If no events found with direct machine ID, try alternative matching
    if (events.length === 0) {
      // Get machine document for alternative identifiers
      const machineDoc = (await Machine.findOne({ _id: machineId })
        .select('machineId relayId serialNumber')
        .lean()) as {
        machineId?: string;
        relayId?: string;
        serialNumber?: string;
      } | null;

      if (machineDoc) {
        // Try alternative identifiers in order of specificity
        const alternativeQueries = [
          { machineId: machineDoc.machineId },
          { relay: machineDoc.relayId },
          { cabinetId: machineDoc.serialNumber },
        ].filter(q => Object.values(q)[0]); // Only include non-null values

        // Try each alternative query with the same filters
        for (const altQuery of alternativeQueries) {
          const combinedQuery = { ...baseQuery, ...altQuery };
          const altEvents = await MachineEvent.find(combinedQuery)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

          if (altEvents.length > 0) {
            events = altEvents;
            break;
          }
        }
      }
    }

    // Get total count for pagination
    let totalEvents = events.length;
    if (events.length > 0) {
      // Use the same query that found results for accurate count
      const countQuery = events.length === limit ? baseQuery : {};
      if (Object.keys(countQuery).length > 0) {
        totalEvents = await MachineEvent.countDocuments(countQuery);
      }
    }

    return NextResponse.json({
      events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalEvents / limit),
        totalEvents,
        hasNextPage: page < Math.ceil(totalEvents / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching machine events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
