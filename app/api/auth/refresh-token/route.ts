/**
 * Refresh Token (Activity Monitor) API Route
 *
 * This route refreshes the user's authentication token if they have been active.
 * It supports:
 * - Token verification from cookies
 * - New token generation with same session
 * - Activity monitor integration for session keep-alive
 *
 * @module app/api/auth/refresh-token/route
 */

import { generateAccessToken, verifyAccessToken } from '@/lib/utils/auth';
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/auth/refresh-token
 *
 * Silently extends the session while the user is active. Called by the activity
 * monitor on a heartbeat interval; takes no explicit body — reads the current
 * `token` cookie, re-signs it with the same payload, and writes the renewed
 * cookie back (maxAge 120 minutes).
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/auth/refresh-token';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Extract token from cookies
    // ============================================================================
    const token = request.cookies.get('token')?.value;

    if (!token) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/refresh-token',
        'No authentication token found',
        user
      );
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 2: Verify current token validity
    // ============================================================================
    const payload = await verifyAccessToken(token);

    if (!payload) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/refresh-token',
        'Invalid or expired token',
        user
      );
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 3: Generate new token with same payload (keep session alive)
    // ============================================================================
    const newToken = await generateAccessToken({
      _id: payload._id,
      emailAddress: payload.emailAddress,
      username: payload.username,
      isEnabled: payload.isEnabled,
      roles: payload.roles,
      assignedLocations: payload.assignedLocations,
      assignedLicencees: payload.assignedLicencees,
      sessionId: payload.sessionId,
      dbContext: payload.dbContext,
    });

    // ============================================================================
    // STEP 4: Set new token as HTTP-only cookie
    // ============================================================================
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });

    response.cookies.set(
      'token',
      newToken,
      getAuthCookieOptions(request, { maxAge: 120 * 60 })
    );

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'POST',
      '/api/auth/refresh-token',
      1,
      user,
      duration
    );

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to refresh token';
    logRouteError(
      functionName,
      'POST',
      '/api/auth/refresh-token',
      errorMessage,
      user
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
