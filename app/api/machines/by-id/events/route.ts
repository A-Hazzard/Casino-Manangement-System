import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { MachineEvent } from "@/app/api/lib/models/machineEvents";
import { Machine } from "@/app/api/lib/models/machines";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("id");
    const eventType = searchParams.get("eventType");
    const event = searchParams.get("event");
    const game = searchParams.get("game");
    const timePeriod = searchParams.get("timePeriod");
    const page = parseInt(searchParams.get("page") || "1");
    const requestedLimit = parseInt(searchParams.get("limit") || "20");
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 20)
        : 20;

    if (!machineId) {
      return NextResponse.json(
        { error: "Machine ID is required" },
        { status: 400 }
      );
    }

    // Optimized query: Start with the most common and specific identifier
    // Most machine events use the machine._id directly
    const query: Record<string, unknown> = { machine: machineId };

    // If no results found with direct match, try alternative identifiers
    let events = await MachineEvent.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // If no events found with direct machine ID, try alternative matching
    if (events.length === 0) {
      // Get machine document for alternative identifiers
      const machineDoc = (await Machine.findOne({ _id: machineId })
        .select("machineId relayId serialNumber")
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
        ].filter((q) => Object.values(q)[0]); // Only include non-null values

        // Try each alternative query
        for (const altQuery of alternativeQueries) {
          const altEvents = await MachineEvent.find(altQuery)
            .sort({ date: -1 })
            .limit(limit)
            .lean();

          if (altEvents.length > 0) {
            events = altEvents;
            break;
          }
        }
      }
    }

    if (eventType) {
      query["eventType"] = { $regex: eventType, $options: "i" } as unknown;
    }

    if (event) {
      query["description"] = { $regex: event, $options: "i" } as unknown;
    }

    if (game) {
      query["gameName"] = { $regex: game, $options: "i" } as unknown;
    }

    // Apply time period filtering if provided
    if (timePeriod && timePeriod !== "All Time") {
      // Use the same timezone-aware approach as the main API
      const tz = "America/Port_of_Spain";
      const now = new Date();

      let startDate: Date | null = null;
      let endDate: Date | null = null;

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
          // No time filtering - return all events
          break;
      }

      // Only add date filter if we have valid start and end dates
      if (startDate && endDate) {
        query["date"] = { $gte: startDate, $lte: endDate } as unknown;
      }
    }

    // Get total count for pagination (only if we have a stable query)
    let totalEvents = events.length;
    if (events.length > 0) {
      // Use the same query that found results for accurate count
      const countQuery = events.length === limit ? query : {};
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
    console.error("Error fetching machine events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
