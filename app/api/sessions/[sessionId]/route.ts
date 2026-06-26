/**
 * @module app/api/sessions/[sessionId]/route
 *
 * Session Details API Route
 *
 * Fetches detailed information about a specific session, joining member profile
 * and machine data for display on the Session Details view.
 *
 * Flow:
 * 1. Validate sessionId path param
 * 2. Aggregate session with member, machine, and location lookups
 * 3. Return session details
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { MachineSession } from '@/app/api/lib/models/machineSessions';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/sessions/[sessionId]
 *
 * Fetches a single machine session with its joined member profile (firstName,
 * lastName) and machine record, plus the location's membership settings.
 * Used by the Session Details page to render the session header and metadata.
 *
 * URL params:
 * @param sessionId {string} Required (path). The string `_id` of the machine session to retrieve.
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
  const startTime = Date.now();
  const functionName = 'GET /api/sessions/[sessionId]';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const sessionId = pathname.split('/').pop();

  try {

    // Validate sessionId
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    // Since _id is defined as String in the schema, we match directly with the string sessionId
    const sessionDetails = await MachineSession.aggregate([
      { $match: { _id: sessionId } },
      {
        $lookup: {
          from: 'members',
          localField: 'memberId',
          foreignField: '_id',
          as: 'member',
        },
      },
      {
        $unwind: {
          path: '$member',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'machines',
          localField: 'machineId',
          foreignField: '_id',
          as: 'machine',
        },
      },
      {
        $unwind: {
          path: '$machine',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'machine.gamingLocation',
          foreignField: '_id',
          as: 'location',
        },
      },
      {
        $unwind: {
          path: '$location',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          memberId: 1,
          machineId: 1,
          startTime: 1,
          endTime: 1,
          status: 1,
          locationMembershipSettings: {
            $ifNull: [
              '$member.locationMembershipSettings',
              '$location.locationMembershipSettings',
            ],
          },
          memberFirstName: '$member.profile.firstName',
          memberLastName: '$member.profile.lastName',
        },
      },
    ]);

    if (!sessionDetails || sessionDetails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const data = sessionDetails[0];

    const duration = Date.now() - startTime;
    if (duration > 1000) console.warn(`[${functionName}] slow: ${duration}ms`);
    logRouteFetch(
      functionName,
      'GET',
      '/api/sessions/[sessionId]',
      1,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/sessions/[sessionId]',
      errorMessage,
      user
    );
    console.error(
      `[SessionDetails API] Error after ${duration}ms:`,
      errorMessage
    );

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
  });
}
