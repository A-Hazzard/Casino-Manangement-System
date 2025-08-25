import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { MachineEvent } from "@/app/api/lib/models/machineEvents";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; machineId: string }> }
) {
  const { sessionId, machineId } = await params;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType");
    const event = searchParams.get("event");
    const game = searchParams.get("game");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const filterDate = searchParams.get("filterDate");

    // Build query - match both session and machine
    const query: Record<string, unknown> = {
      machine: machineId,
    };

    // Only add session filter if sessionId is provided and valid
    if (sessionId && sessionId !== "undefined" && sessionId !== "null") {
      query.currentSession = sessionId;
    }

    if (eventType) {
      query.eventType = { $regex: eventType, $options: "i" };
    }

    if (event) {
      query.description = { $regex: event, $options: "i" };
    }

    if (game) {
      query.gameName = { $regex: game, $options: "i" };
    }

    // Add date filtering - filter events from the specified date/time onwards
    if (filterDate) {
      query.date = {
        $gte: new Date(filterDate),
      };
    }

    // Get total count for pagination
    const totalEvents = await MachineEvent.countDocuments(query);

    // Fetch events with pagination
    const events = await MachineEvent.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Build filter query
    const filterQuery: Record<string, unknown> = { machine: machineId };
    if (sessionId && sessionId !== "undefined" && sessionId !== "null") {
      filterQuery.currentSession = sessionId;
    }

    // Add date filtering to filter query as well
    if (filterDate) {
      filterQuery.date = {
        $gte: new Date(filterDate),
      };
    }

    // Get unique values for filters
    const [eventTypes, eventsList, games] = await Promise.all([
      MachineEvent.distinct("eventType", filterQuery),
      MachineEvent.distinct("description", filterQuery),
      MachineEvent.distinct("gameName", filterQuery),
    ]);

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
    console.error("Error fetching session events:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
