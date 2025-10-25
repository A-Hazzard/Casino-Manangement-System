import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import type { PipelineStage } from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; machineId: string }> }
) {
  const { sessionId, machineId } = await params;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const event = searchParams.get('event');
    const game = searchParams.get('game');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const filterDate = searchParams.get('filterDate');
    const licensee = searchParams.get('licensee');

    // Build query - match both session and machine
    const query: Record<string, unknown> = {
      machine: machineId,
    };

    // Only add session filter if sessionId is provided and valid
    if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
      query.currentSession = sessionId;
    }

    if (eventType) {
      query.eventType = { $regex: eventType, $options: 'i' };
    }

    if (event) {
      query.description = { $regex: event, $options: 'i' };
    }

    if (game) {
      query.gameName = { $regex: game, $options: 'i' };
    }

    // Add date filtering based on startDate and endDate parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    // If licensee is provided, we need to filter events by licensee through machine lookup
    let events;
    let totalEvents;

    if (licensee) {
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
      // No licensee filter, use simple query
      totalEvents = await MachineEvent.countDocuments(query);
      events = await MachineEvent.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    // Build filter query
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
      // Legacy support for filterDate
      filterQuery.date = {
        $gte: new Date(filterDate),
      };
    }

    // Get unique values for filters
    let eventTypes: string[], eventsList: string[], games: string[];

    if (licensee) {
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
      // No licensee filter, use simple distinct queries
      [eventTypes, eventsList, games] = await Promise.all([
        MachineEvent.distinct('eventType', filterQuery),
        MachineEvent.distinct('description', filterQuery),
        MachineEvent.distinct('gameName', filterQuery),
      ]);
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
    console.error('Error fetching session events:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
