/**
 * System Initialization Status API
 *
 * Public endpoint that reports whether the system has been initialized.
 * Used by the login and install pages to decide where to redirect.
 *
 * Flow:
 * 1. Connect to database
 * 2. Check if any user document exists
 * 3. Return { initialized: boolean }
 *
 * @module app/api/install/status/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextResponse } from 'next/server';

/**
 * GET /api/install/status
 * Returns whether the system has at least one user (i.e. has been initialized).
 */
export async function GET() {
  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Check for any existing user (lean + limit 1 for performance)
    // ============================================================================
    const existingUser = await UserModel.findOne({}).select('_id').lean();

    // ============================================================================
    // STEP 3: Return initialization status
    // ============================================================================
    return NextResponse.json({ initialized: !!existingUser }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Install Status API] Error:', errorMessage);

    return NextResponse.json(
      { initialized: false, error: 'Failed to check system status.' },
      { status: 500 }
    );
  }
}
