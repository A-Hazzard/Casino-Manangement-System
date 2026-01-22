/**
 * Members Debug API Route
 *
 * This route provides debugging information about members in the database.
 * It supports:
 * - Getting member counts (total, with/without deletedAt)
 * - Fetching sample members for inspection
 * - Useful for debugging member data structure and soft-delete implementation
 *
 * @module app/api/members/debug/route
 * @features Debugging, Member Statistics, Data Inspection
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { Member } from '@/app/api/lib/models/members';
import { NextResponse } from 'next/server';

/**
 * Main GET handler for fetching member debug information
 *
 * Flow:
 * 1. Connect to database
 * 2. Get member counts (total, with/without deletedAt)
 * 3. Fetch sample members for inspection
 * 4. Return debug information
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Get member counts
    // ============================================================================
    const totalMembers = await Member.countDocuments({});
    const membersWithDeletedAt = await Member.countDocuments({
      deletedAt: { $exists: true },
    });
    const membersWithoutDeletedAt = await Member.countDocuments({
      deletedAt: { $exists: false },
    });
    const membersWithNullDeletedAt = await Member.countDocuments({
      deletedAt: null,
    });

    // ============================================================================
    // STEP 3: Fetch sample members for inspection
    // ============================================================================
    const sampleMembers = await Member.find({}).limit(5).lean();

    // ============================================================================
    // STEP 4: Return debug information
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Members Debug GET API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          totalMembers,
          membersWithDeletedAt,
          membersWithoutDeletedAt,
          membersWithNullDeletedAt,
        },
        sampleMembers,
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Members Debug GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

