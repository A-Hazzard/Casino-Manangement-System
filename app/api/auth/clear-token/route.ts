/**
 * Clear Token API Route
 *
 * This route handles clearing the authentication token cookie.
 * It supports:
 * - Clearing access token cookie
 * - Used when token needs to be invalidated
 *
 * @module app/api/auth/clear-token/route
 * @features Token Management, Cookie Clearing, Authentication
 */

import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/clear-token
 *
 * Expires the access token cookie only, leaving the refresh token intact. Takes
 * no request body; clears the `token` cookie. Used when only the short-lived
 * access token needs to be invalidated without ending the full session.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Create success response
    // ============================================================================
    const response = NextResponse.json({
      success: true,
      message: 'Token cleared successfully. Please login again.',
    });

    // ============================================================================
    // STEP 2: Clear token cookie
    // ============================================================================
    response.cookies.set('token', '', getAuthCookieOptions(request, { maxAge: 0 }));

    // ============================================================================
    // STEP 3: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.warn(`[Clear Token POST API] Completed in ${duration}ms`);
    }

    return response;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Clear Token POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: 'Failed to clear token' },
      { status: 500 }
    );
  }
}

