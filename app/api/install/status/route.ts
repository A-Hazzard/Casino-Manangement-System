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
import type { LeanUserDocument } from '@/shared/types/auth';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/install/status
 * Returns whether the system has at least one user (i.e. has been initialized).
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/install/status';
  const user = extractUserFromRequest(request);
  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Check for any existing user (lean + limit 1 for performance)
    // ============================================================================
    const existingUser = await UserModel.findOne({})
      .select('_id')
      .lean<LeanUserDocument | null>();

    // ============================================================================
    // STEP 3: Return initialization status
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/install/status',
      1,
      user,
      duration
    );
    return NextResponse.json({ initialized: !!existingUser }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logRouteError(
      functionName,
      'GET',
      '/api/install/status',
      errorMessage,
      user
    );

    return NextResponse.json(
      { initialized: false, error: 'Failed to check system status.' },
      { status: 500 }
    );
  }
}
