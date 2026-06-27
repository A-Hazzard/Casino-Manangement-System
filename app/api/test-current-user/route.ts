/**
 * Test Current User API Route
 *
 * This route is a test endpoint to verify that authentication tokens are properly set.
 * It is used during login to confirm cookies are working before showing success message.
 *
 * @module app/api/test-current-user/route
 * @features Token Verification, Authentication Testing, Login Flow Support
 */

import { getUserIdFromServer } from '@/app/api/lib/helpers/users/users';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

export const runtime = 'nodejs';

/**
 * Main GET handler for verifying authentication token
 *
 * Flow:
 * 1. Get user ID from authentication token cookie
 * 2. Validate token and return user ID if valid
 * 3. Return error response if token is invalid or missing
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/test-current-user';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
  try {
    // ============================================================================
    // STEP 1: Get user ID from authentication token cookie
    // ============================================================================
    const userId = await getUserIdFromServer();

    // ============================================================================
    // STEP 2: Validate token and return user ID if valid
    // ============================================================================
    if (!userId) {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[Test Current User GET API] Completed in ${duration}ms`);
      }
      logRouteError(
        functionName,
        'GET',
        '/api/test-current-user',
        'No valid authentication token found',
        user
      );
      return NextResponse.json(
        {
          success: false,
          message: 'No valid authentication token found',
          userId: null,
        },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 3: Return success response with user ID
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Test Current User GET API] Completed in ${duration}ms`);
    }

    logRouteFetch(
      functionName,
      'GET',
      '/api/test-current-user',
      1,
      user,
      duration
    );
    return NextResponse.json(
      {
        success: true,
        message: 'Token verified successfully',
        userId: userId,
      },
      { status: 200 }
    );
  } catch (e) {
    const duration = Date.now() - startTime;
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error';
    console.error(
      `[TEST-CURRENT-USER] Token verification error after ${duration}ms:`,
      errorMessage
    );
    logRouteError(
      functionName,
      'GET',
      '/api/test-current-user',
      errorMessage,
      user
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Token verification failed',
        userId: null,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
  }, { bypassDb: true, optionalAuth: true });
}
