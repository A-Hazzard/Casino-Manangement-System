import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { MachineEvent } from "@/app/api/lib/models/machineEvents";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType");
    const event = searchParams.get("event");
    const game = searchParams.get("game");
    const timePeriod = searchParams.get("timePeriod");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    const query: Record<string, unknown> = { machine: id };

    if (eventType) {
      query.eventType = { $regex: eventType, $options: "i" };
    }

    if (event) {
      query.description = { $regex: event, $options: "i" };
    }

    if (game) {
      query.gameName = { $regex: game, $options: "i" };
    }

    // Apply time period filtering if provided
    if (timePeriod && timePeriod !== "All Time") {
      // Use the same timezone-aware approach as the main API
      const tz = "America/Port_of_Spain";
      const now = new Date();

      let startDate: Date;
      let endDate: Date;

      switch (timePeriod) {
        case "Today":
          startDate = new Date(
            now.toLocaleDateString("en-CA", { timeZone: tz }) + "T00:00:00.000Z"
          );
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case "Yesterday":
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          startDate = new Date(
            yesterday.toLocaleDateString("en-CA", { timeZone: tz }) +
              "T00:00:00.000Z"
          );
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case "7d":
          endDate = now;
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          endDate = now;
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
          endDate = now;
      }

      query.timestamp = {
        $gte: startDate,
        $lte: endDate,
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
    console.error("Error fetching machine events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
