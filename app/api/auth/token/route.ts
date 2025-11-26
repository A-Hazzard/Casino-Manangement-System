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

import { getUserIdFromServer } from '@/app/api/lib/helpers/users';
import { NextResponse } from 'next/server';

/**
 * Main GET handler for token validation
 *
 * Flow:
 * 1. Extract and validate user ID from JWT token
 * 2. Return user ID if authenticated
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
