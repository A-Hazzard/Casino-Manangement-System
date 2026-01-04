/**
 * Session Events API Route
 *
 * Fetches machine events for a specific session with filtering and pagination.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; machineId: string }> }
) {
  const startTime = Date.now();
  const { sessionId, machineId } = await params;

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
    const matchQuery: Record<string, any> = {
      machine: machineId,
      currentSession: sessionId,
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
    const pipeline: any[] = [
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
          eventTypes: data.eventTypes.map((e: any) => e._id).filter(Boolean),
          events: data.events.map((e: any) => e._id).filter(Boolean),
          games: games.filter(Boolean),
        },
      },
    });
  } catch (error) {
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
