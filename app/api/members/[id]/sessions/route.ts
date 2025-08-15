import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { MachineSession } from "@/app/api/lib/models/machineSessions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const filter = searchParams.get("filter") || "session";

    // Build query for member sessions
    let query: any = { memberId: id };

    // For grouped views, we need to fetch all sessions and group them on the server
    // For individual sessions, we can use pagination
    if (filter === "session") {
      // Get total count for pagination
      const totalSessions = await MachineSession.countDocuments(query);

      // Fetch sessions with pagination
      const sessions = await MachineSession.find(query)
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Process individual sessions
      const processedSessions = sessions.map((session) => {
        let duration = null;
        let sessionLength = "N/A";

        if (session.startTime && session.endTime) {
          const start = new Date(session.startTime);
          const end = new Date(session.endTime);
          const durationMs = end.getTime() - start.getTime();
          duration = Math.round(durationMs / (1000 * 60)); // Duration in minutes

          // Format session length as HH:MM:SS
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor(
            (durationMs % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
          sessionLength = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }

        // Calculate handle (total money in) - using startBillMeters.dollarTotal + startMeters.drop
        const handle =
          (session.startBillMeters?.dollarTotal || 0) +
          (session.startMeters?.drop || 0);

        // Calculate cancelled credits from endMeters
        const cancelledCredits = session.endMeters?.totalCancelledCredits || 0;

        // Calculate jackpot from endMeters
        const jackpot = session.endMeters?.jackpot || 0;

        // Calculate coin in/out from endMeters
        const coinIn = session.endMeters?.coinIn || 0;
        const coinOut = session.endMeters?.coinOut || 0;

        // Calculate won/less (coin out - coin in)
        const wonLess = coinOut - coinIn;

        // Calculate bet (coin in)
        const bet = coinIn;

        // Calculate won (coin out)
        const won = coinOut;

        return {
          _id: session._id,
          sessionId: session._id,
          machineId: session.machineId,
          time: session.startTime,
          sessionLength,
          handle,
          cancelledCredits,
          jackpot,
          won,
          bet,
          wonLess,
          points: session.points || 0,
          gamesPlayed: session.gamesPlayed || 0,
          gamesWon: session.gamesWon || 0,
          coinIn,
          coinOut,
          duration,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          sessions: processedSessions,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalSessions / limit),
            totalSessions,
            hasNextPage: page < Math.ceil(totalSessions / limit),
            hasPrevPage: page > 1,
          },
        },
      });
    } else {
      // For grouped views, fetch all sessions and group them
      const allSessions = await MachineSession.find(query)
        .sort({ startTime: -1 })
        .lean();

      // Group by date periods (day, week, month)
      const groupedSessions = new Map();

      allSessions.forEach((session) => {
        if (session.startTime) {
          const sessionDate = new Date(session.startTime);
          let groupKey: string;

          switch (filter) {
            case "day":
              groupKey = sessionDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              break;
            case "week":
              const weekStart = new Date(sessionDate);
              const dayOfWeek = sessionDate.getDay();
              const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              weekStart.setDate(sessionDate.getDate() - daysToSubtract);
              weekStart.setHours(0, 0, 0, 0);
              groupKey = weekStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              break;
            case "month":
              groupKey = sessionDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              });
              break;
            default:
              groupKey = sessionDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
          }

          if (!groupedSessions.has(groupKey)) {
            groupedSessions.set(groupKey, {
              _id: groupKey,
              sessionId: groupKey,
              machineId: "N/A",
              time: sessionDate,
              sessionLength: "N/A",
              handle: 0,
              cancelledCredits: 0,
              jackpot: 0,
              won: 0,
              bet: 0,
              wonLess: 0,
              points: 0,
              gamesPlayed: 0,
              gamesWon: 0,
              coinIn: 0,
              coinOut: 0,
              duration: 0,
              sessionCount: 0,
              totalDuration: 0,
            });
          }

          const group = groupedSessions.get(groupKey);

          // Calculate session metrics
          const handle =
            (session.startBillMeters?.dollarTotal || 0) +
            (session.startMeters?.drop || 0);
          const cancelledCredits =
            session.endMeters?.totalCancelledCredits || 0;
          const jackpot = session.endMeters?.jackpot || 0;
          const coinIn = session.endMeters?.coinIn || 0;
          const coinOut = session.endMeters?.coinOut || 0;
          const wonLess = coinOut - coinIn;
          const bet = coinIn;
          const won = coinOut;

          // Sum up all metrics
          group.handle += handle;
          group.cancelledCredits += cancelledCredits;
          group.jackpot += jackpot;
          group.won += won;
          group.bet += bet;
          group.wonLess += wonLess;
          group.points += session.points || 0;
          group.gamesPlayed += session.gamesPlayed || 0;
          group.gamesWon += session.gamesWon || 0;
          group.coinIn += coinIn;
          group.coinOut += coinOut;
          group.sessionCount += 1;

          // Calculate total duration
          if (session.startTime && session.endTime) {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            const durationMs = end.getTime() - start.getTime();
            group.totalDuration += durationMs;
          }
        }
      });

      // Convert grouped sessions to array and format duration
      const processedSessions = Array.from(groupedSessions.values()).map(
        (group) => {
          // Format total duration as HH:MM:SS
          const hours = Math.floor(group.totalDuration / (1000 * 60 * 60));
          const minutes = Math.floor(
            (group.totalDuration % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor(
            (group.totalDuration % (1000 * 60)) / 1000
          );
          const sessionLength = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

          return {
            ...group,
            sessionLength,
            time: group.time,
          };
        }
      );

      // Sort by date (newest first)
      processedSessions.sort(
        (a: any, b: any) =>
          new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      return NextResponse.json({
        success: true,
        data: {
          sessions: processedSessions,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalSessions: processedSessions.length,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    }

    // Get total count for pagination
    const totalSessions = await MachineSession.countDocuments(query);

    // Fetch sessions with pagination
    const sessions = await MachineSession.find(query)
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Process sessions based on filter type
    let processedSessions;

    if (filter === "session") {
      // Individual sessions - calculate duration and format data for each session
      processedSessions = sessions.map((session) => {
        let duration = null;
        let sessionLength = "N/A";

        if (session.startTime && session.endTime) {
          const start = new Date(session.startTime);
          const end = new Date(session.endTime);
          const durationMs = end.getTime() - start.getTime();
          duration = Math.round(durationMs / (1000 * 60)); // Duration in minutes

          // Format session length as HH:MM:SS
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor(
            (durationMs % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
          sessionLength = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }

        // Calculate handle (total money in) - using startBillMeters.dollarTotal + startMeters.drop
        const handle =
          (session.startBillMeters?.dollarTotal || 0) +
          (session.startMeters?.drop || 0);

        // Calculate cancelled credits from endMeters
        const cancelledCredits = session.endMeters?.totalCancelledCredits || 0;

        // Calculate jackpot from endMeters
        const jackpot = session.endMeters?.jackpot || 0;

        // Calculate coin in/out from endMeters
        const coinIn = session.endMeters?.coinIn || 0;
        const coinOut = session.endMeters?.coinOut || 0;

        // Calculate won/less (coin out - coin in)
        const wonLess = coinOut - coinIn;

        // Calculate bet (coin in)
        const bet = coinIn;

        // Calculate won (coin out)
        const won = coinOut;

        return {
          _id: session._id,
          sessionId: session._id,
          machineId: session.machineId,
          time: session.startTime,
          sessionLength,
          handle,
          cancelledCredits,
          jackpot,
          won,
          bet,
          wonLess,
          points: session.points || 0,
          gamesPlayed: session.gamesPlayed || 0,
          gamesWon: session.gamesWon || 0,
          coinIn,
          coinOut,
          duration,
        };
      });
    } else {
      // Group by date periods (day, week, month)
      const groupedSessions = new Map();

      sessions.forEach((session) => {
        if (session.startTime) {
          const sessionDate = new Date(session.startTime);
          let groupKey: string;

          switch (filter) {
            case "day":
              groupKey = sessionDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              break;
            case "week":
              const weekStart = new Date(sessionDate);
              const dayOfWeek = sessionDate.getDay();
              const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              weekStart.setDate(sessionDate.getDate() - daysToSubtract);
              weekStart.setHours(0, 0, 0, 0);
              groupKey = weekStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              break;
            case "month":
              groupKey = sessionDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              });
              break;
            default:
              groupKey = sessionDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
          }

          if (!groupedSessions.has(groupKey)) {
            groupedSessions.set(groupKey, {
              _id: groupKey,
              sessionId: groupKey,
              machineId: "N/A",
              time: sessionDate,
              sessionLength: "N/A",
              handle: 0,
              cancelledCredits: 0,
              jackpot: 0,
              won: 0,
              bet: 0,
              wonLess: 0,
              points: 0,
              gamesPlayed: 0,
              gamesWon: 0,
              coinIn: 0,
              coinOut: 0,
              duration: 0,
              sessionCount: 0,
              totalDuration: 0,
            });
          }

          const group = groupedSessions.get(groupKey);

          // Calculate session metrics
          const handle =
            (session.startBillMeters?.dollarTotal || 0) +
            (session.startMeters?.drop || 0);
          const cancelledCredits =
            session.endMeters?.totalCancelledCredits || 0;
          const jackpot = session.endMeters?.jackpot || 0;
          const coinIn = session.endMeters?.coinIn || 0;
          const coinOut = session.endMeters?.coinOut || 0;
          const wonLess = coinOut - coinIn;
          const bet = coinIn;
          const won = coinOut;

          // Sum up all metrics
          group.handle += handle;
          group.cancelledCredits += cancelledCredits;
          group.jackpot += jackpot;
          group.won += won;
          group.bet += bet;
          group.wonLess += wonLess;
          group.points += session.points || 0;
          group.gamesPlayed += session.gamesPlayed || 0;
          group.gamesWon += session.gamesWon || 0;
          group.coinIn += coinIn;
          group.coinOut += coinOut;
          group.sessionCount += 1;

          // Calculate total duration
          if (session.startTime && session.endTime) {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            const durationMs = end.getTime() - start.getTime();
            group.totalDuration += durationMs;
          }
        }
      });

      // Convert grouped sessions to array and format duration
      const processedSessions = Array.from(groupedSessions.values()).map(
        (group) => {
          // Format total duration as HH:MM:SS
          const hours = Math.floor(group.totalDuration / (1000 * 60 * 60));
          const minutes = Math.floor(
            (group.totalDuration % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor(
            (group.totalDuration % (1000 * 60)) / 1000
          );
          const sessionLength = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

          return {
            ...group,
            sessionLength,
            time: group.time,
          };
        }
      );

      // Sort by date (newest first)
      processedSessions.sort(
        (a: any, b: any) =>
          new Date(b.time).getTime() - new Date(a.time).getTime()
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions: processedSessions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalSessions / limit),
          totalSessions,
          hasNextPage: page < Math.ceil(totalSessions / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching member sessions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
