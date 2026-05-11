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
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/auth/token
 *
 * Validates the current session and returns the authenticated user's ID. Takes
 * no query params; reads the `token` JWT cookie and extracts the userId from
 * the verified payload.
 */
export async function GET() {
  const startTime = Date.now();
  const functionName = 'GET /api/auth/token';
  const user = extractUserFromRequest(null);

  try {
    // ============================================================================
    // STEP 1: Extract and validate user ID from JWT token
    // ============================================================================
    const userId = await getUserIdFromServer();

    if (!userId) {
      logRouteError(
        functionName,
        'GET',
        '/api/auth/token',
        'Unauthorized',
        user
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================================================
    // STEP 2: Return user ID if authenticated
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(functionName, 'GET', '/api/auth/token', 1, user, duration);

    return NextResponse.json({ userId });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(functionName, 'GET', '/api/auth/token', errorMessage, user);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
