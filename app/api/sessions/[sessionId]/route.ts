/**
 * Machine Session Details API Route
 *
 * This route handles fetching machine session details including membership settings.
 * It supports:
 * - Session metadata retrieval
 * - Location membership settings
 * - Member information
 *
 * @module app/api/sessions/[sessionId]/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineSession } from '@/app/api/lib/models/machineSessions';
import { Member } from '@/app/api/lib/models/members';
import type { LocationMembershipSettings } from '@/shared/types/entities';
import { NextRequest, NextResponse } from 'next/server';

type MachineSessionDocument = {
  _id: string;
  memberId: string;
  machineId: string;
  locationMembershipSettings?: LocationMembershipSettings;
  startTime?: Date;
  endTime?: Date;
  status?: string;
};

/**
 * Main GET handler for fetching machine session details
 *
 * Flow:
 * 1. Parse route parameters
 * 2. Connect to database
 * 3. Fetch session document by _id
 * 4. Return session info with membership settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and query parameters
    // ============================================================================
    const { sessionId } = await params;

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Fetch session document by _id
    // ============================================================================
    const sessionDocument = await MachineSession.findOne({
      _id: sessionId,
    })
      .select({
        _id: 1,
        memberId: 1,
        machineId: 1,
        locationMembershipSettings: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
      })
      .lean<MachineSessionDocument | null>();

    // ============================================================================
    // STEP 4: Fetch member information
    // ============================================================================
    if (!sessionDocument) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Fetch member information
    let memberFirstName: string | undefined;
    let memberLastName: string | undefined;
    
    if (sessionDocument.memberId) {
      try {
        const member = await Member.findOne({ _id: sessionDocument.memberId })
          .select({ 'profile.firstName': 1, 'profile.lastName': 1 })
          .lean<{ profile?: { firstName?: string; lastName?: string } } | null>();
        
        if (member?.profile) {
          memberFirstName = member.profile.firstName;
          memberLastName = member.profile.lastName;
        }
      } catch (error) {
        console.warn('Failed to fetch member information:', error);
        // Continue without member info
      }
    }

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Machine Session API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: sessionDocument._id,
        memberId: sessionDocument.memberId,
        machineId: sessionDocument.machineId,
        locationMembershipSettings: sessionDocument.locationMembershipSettings,
        startTime: sessionDocument.startTime,
        endTime: sessionDocument.endTime,
        status: sessionDocument.status,
        memberFirstName,
        memberLastName,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Machine Session API] Error after ${duration}ms:`,
      errorMessage,
      error
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
