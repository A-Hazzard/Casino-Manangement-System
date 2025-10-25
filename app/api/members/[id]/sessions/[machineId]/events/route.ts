import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; machineId: string }> }
) {
  try {
    await connectDB();

    const { machineId } = await params;

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const event = searchParams.get('event');
    const game = searchParams.get('game');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build optimized query with indexing considerations
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

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Optimized query with projection to reduce data transfer
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

    // Get total count for pagination with optimized query
    const totalEvents = await MachineEvent.countDocuments(query);

    // Get unique values for filters with optimized aggregation
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

    const response = {
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
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching machine events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch machine events' },
      { status: 500 }
    );
  }
}
