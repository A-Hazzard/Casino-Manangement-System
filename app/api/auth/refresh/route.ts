/**
 * Refresh Access Token API Route
 *
 * This route handles refreshing an expired access token using a refresh token.
 * It supports:
 * - Refresh token from request body or cookies
 * - New access token generation
 * - HTTP-only cookie storage for new token
 *
 * @module app/api/auth/refresh/route
 */

import { refreshAccessToken } from '@/app/api/lib/helpers/auth/auth';
import { getFriendlyErrorMessage } from '@/lib/utils/auth';
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/auth/refresh
 *
 * Issues a new short-lived access token using a valid refresh token. Called when
 * the access token has expired and a full re-login should be avoided.
 *
 * Body fields:
 * @param refreshToken {string} Optional. The refresh token string. When omitted or set to
 *                              the literal "auto", the token is read from the `refreshToken`
 *                              HTTP-only cookie instead.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/auth/refresh';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Parse refresh token from request body or cookies
    // ============================================================================
    const body = await request.json();
    const { refreshToken } = body;

    // If no refresh token in body, try to get it from cookies
    let tokenToUse = refreshToken;
    if (!tokenToUse || tokenToUse === 'auto') {
      const cookies = request.cookies.get('refreshToken');
      tokenToUse = cookies?.value;
    }

    // ============================================================================
    // STEP 2: Validate refresh token presence
    // ============================================================================
    if (!tokenToUse) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/refresh',
        'Refresh token is required',
        user
      );
      return NextResponse.json(
        { success: false, message: 'Refresh token is required.' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Refresh access token using refresh token
    // ============================================================================
    const result = await refreshAccessToken(tokenToUse);

    if (!result.success) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/refresh',
        'Token refresh failed',
        user
      );
      return NextResponse.json(result, { status: 401 });
    }

    // ============================================================================
    // STEP 4: Set new access token as HTTP-only cookie
    // ============================================================================
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });

    response.cookies.set(
      'token',
      result.token!,
      getAuthCookieOptions(request, { maxAge: 60 * 60 })
    );

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(functionName, 'POST', '/api/auth/refresh', 1, user, duration);

    return response;
  } catch (error) {
    const errorMessage = getFriendlyErrorMessage(
      error instanceof Error ? error.message : 'Token refresh failed'
    );
    logRouteError(
      functionName,
      'POST',
      '/api/auth/refresh',
      errorMessage,
      user
    );
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
