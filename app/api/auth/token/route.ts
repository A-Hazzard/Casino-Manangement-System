/**
 * Token Validation API Route
 *
 * This route validates the current user's JWT token and returns the user ID.
 * It supports:
 * - JWT token validation
 * - User ID extraction from token
 * - Session validation
 *
 * @module app/api/auth/token/route
 */

import { getUserIdFromServer } from '@/app/api/lib/helpers/users/users';
import { NextResponse } from 'next/server';

/**
 * GET /api/auth/token
 *
 * Validates the current session and returns the authenticated user's ID. Takes
 * no query params; reads the `token` JWT cookie and extracts the userId from
 * the verified payload.
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Extract and validate user ID from JWT token
    // ============================================================================
    const userId = await getUserIdFromServer();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================================================
    // STEP 2: Return user ID if authenticated
    // ============================================================================
    return NextResponse.json({ userId });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Token API] Error after ${duration}ms:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

