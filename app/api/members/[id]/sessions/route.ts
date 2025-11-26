/**
 * Member Sessions API Route
 *
 * This route handles fetching member sessions with filtering and grouping.
 * It supports:
 * - Individual session view with pagination
 * - Grouped views by day, week, or month
 * - Currency conversion
 * - Financial metrics calculation
 * - Session duration calculation
 *
 * @module app/api/members/[id]/sessions/route
 */

import {
  applyCurrencyConversionToMetrics,
  getCurrencyFromQuery,
  shouldApplyCurrencyConversion,
} from '@/app/api/lib/helpers/currencyHelper';
import { MachineSession } from '@/app/api/lib/models/machineSessions';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper function to calculate ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Main GET handler for fetching member sessions
 *
 * Flow:
 * 1. Parse route parameters and query parameters
 * 2. Connect to database
 * 3. Build query for member sessions
 * 4. Handle individual session view or grouped view
 * 5. Process sessions and calculate metrics
 * 6. Apply currency conversion if needed
 * 7. Return paginated results
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and query parameters
    // ============================================================================
    const { id } = await params;

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Build query for member sessions
    // ============================================================================

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const filter = searchParams.get('filter') || 'session';
    const displayCurrency = getCurrencyFromQuery(searchParams);
    const licencee = searchParams.get('licencee') || null;

    const query: Record<string, unknown> = { memberId: id };

    // ============================================================================
    // STEP 4: Handle individual session view or grouped view
    // ============================================================================
    if (filter === 'session') {
      // ============================================================================
      // STEP 5: Process individual sessions
      // ============================================================================
      const totalSessions = await MachineSession.countDocuments(query);

      const sessions = await MachineSession.find(query)
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const processedSessions = sessions.map(session => {
        let duration = null;
        let sessionLength = 'N/A';

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
          sessionLength = `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        // Calculate handle (total bets placed) - using movement.coinIn from financial guide
        const handle = session.endMeters?.movement?.coinIn || 0;

        // Calculate money in (physical cash inserted) from endMeters using financial guide
        const moneyIn = session.endMeters?.movement?.drop || 0;

        // Calculate money out (manual payouts) from endMeters using financial guide
        const moneyOut =
          session.endMeters?.movement?.totalCancelledCredits || 0;

        // Calculate jackpot from endMeters using movement field
        const jackpot = session.endMeters?.movement?.jackpot || 0;

        // Calculate coin in/out from endMeters using movement fields
        const coinIn = session.endMeters?.movement?.coinIn || 0;
        const coinOut = session.endMeters?.movement?.coinOut || 0;

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
          time: session.startTime
            ? new Date(session.startTime).toLocaleString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : 'N/A',
          sessionLength,
          handle,
          moneyIn,
          moneyOut,
          jackpot,
          won,
          bet,
          wonLess,
          points: session.points || 0,
          gamesPlayed: session.endMeters?.movement?.gamesPlayed || 0,
          gamesWon: session.gamesWon || 0,
          coinIn,
          coinOut,
          duration,
        };
      });

      // ============================================================================
      // STEP 6: Apply currency conversion if needed
      // ============================================================================
      const convertedSessions = await applyCurrencyConversionToMetrics(
        processedSessions,
        licencee,
        displayCurrency
      );

      // ============================================================================
      // STEP 7: Return paginated results
      // ============================================================================
      return NextResponse.json({
        success: true,
        data: {
          sessions: convertedSessions,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalSessions / limit),
            totalSessions,
            hasNextPage: page < Math.ceil(totalSessions / limit),
            hasPrevPage: page > 1,
          },
        },
        currency: displayCurrency,
        converted: shouldApplyCurrencyConversion(licencee),
      });
    } else {
      // ============================================================================
      // STEP 5: Process grouped sessions
      // ============================================================================
      const allSessions = await MachineSession.find(query)
        .sort({ startTime: -1 })
        .lean();

      const groupedSessions = new Map();

      allSessions.forEach(session => {
        if (session.startTime) {
          const sessionDate = new Date(session.startTime);
          let groupKey: string;

          switch (filter) {
            case 'day':
              groupKey = sessionDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
              break;
            case 'week':
              const weekStart = new Date(sessionDate);
              const dayOfWeek = sessionDate.getDay();
              const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              weekStart.setDate(sessionDate.getDate() - daysToSubtract);
              weekStart.setHours(0, 0, 0, 0);

              // Calculate week number (ISO week number)
              const weekNumber = getWeekNumber(weekStart);

              groupKey = `Week ${weekNumber}, ${weekStart.toLocaleDateString(
                'en-US',
                {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }
              )}`;
              break;
            case 'month':
              groupKey = sessionDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              });
              break;
            default:
              groupKey = sessionDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
          }

          if (!groupedSessions.has(groupKey)) {
            groupedSessions.set(groupKey, {
              _id: groupKey,
              sessionId: groupKey,
              machineId: 'N/A',
              time: groupKey,
              sessionLength: 'N/A',
              handle: 0,
              moneyIn: 0,
              moneyOut: 0,
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
          const handle = session.endMeters?.movement?.coinIn || 0;
          const moneyIn = session.endMeters?.movement?.drop || 0;
          const moneyOut =
            session.endMeters?.movement?.totalCancelledCredits || 0;
          const jackpot = session.endMeters?.movement?.jackpot || 0;
          const coinIn = session.endMeters?.movement?.coinIn || 0;
          const coinOut = session.endMeters?.movement?.coinOut || 0;
          const wonLess = coinOut - coinIn;
          const bet = coinIn;
          const won = coinOut;

          // Sum up all metrics
          group.handle += handle;
          group.moneyIn += moneyIn;
          group.moneyOut += moneyOut;
          group.jackpot += jackpot;
          group.won += won;
          group.bet += bet;
          group.wonLess += wonLess;
          group.points += session.points || 0;
          group.gamesPlayed += session.endMeters?.movement?.gamesPlayed || 0;
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
        group => {
          // Format total duration as HH:MM:SS
          const hours = Math.floor(group.totalDuration / (1000 * 60 * 60));
          const minutes = Math.floor(
            (group.totalDuration % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor(
            (group.totalDuration % (1000 * 60)) / 1000
          );
          const sessionLength = `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

          return {
            ...group,
            sessionLength,
            time: group.time,
          };
        }
      );

      processedSessions.sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) =>
          new Date(b.time as string).getTime() -
          new Date(a.time as string).getTime()
      );

      // ============================================================================
      // STEP 6: Apply currency conversion if needed
      // ============================================================================
      const convertedGroupedSessions = await applyCurrencyConversionToMetrics(
        processedSessions,
        licencee,
        displayCurrency
      );

      // ============================================================================
      // STEP 7: Return paginated results
      // ============================================================================
      return NextResponse.json({
        success: true,
        data: {
          sessions: convertedGroupedSessions,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalSessions: processedSessions.length,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
        currency: displayCurrency,
        converted: shouldApplyCurrencyConversion(licencee),
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Member Sessions API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
