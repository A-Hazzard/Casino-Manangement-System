/**
 * Logout API Route
 *
 * This route handles user logout by clearing authentication cookies.
 * It supports:
 * - Clearing access token cookie
 * - Clearing refresh token cookie
 * - Secure cookie deletion
 *
 * @module app/api/auth/logout/route
 */

import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/auth/logout
 *
 * Ends the user's session by expiring all auth cookies. Takes no request body;
 * clears the `token` (access token) and `refreshToken` cookies.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/auth/logout';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Create success response
    // ============================================================================
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // ============================================================================
    // STEP 2: Clear access token cookie
    // ============================================================================
    const clearOptions = getAuthCookieOptions(request, { maxAge: 0 });
    response.cookies.set('token', '', clearOptions);

    // ============================================================================
    // STEP 3: Clear refresh token cookie
    // ============================================================================
    response.cookies.set('refreshToken', '', clearOptions);

    // ============================================================================
    // STEP 4: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteCreate(functionName, 'POST', '/api/auth/logout', 1, user, duration);

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(functionName, 'POST', '/api/auth/logout', errorMessage, user);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
