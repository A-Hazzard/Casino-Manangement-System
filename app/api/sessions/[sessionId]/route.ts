/**
 * Session Details API Route
 *
 * Fetches detailed information about a specific session.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineSession } from '@/app/api/lib/models/machineSessions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();
  const { sessionId } = await params;

  try {
    await connectDB();

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

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[SessionDetails API] Error after ${duration}ms:`,
      errorMessage
    );

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
