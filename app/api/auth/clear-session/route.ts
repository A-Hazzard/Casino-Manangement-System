/**
 * Clear Session API Route
 *
 * This route handles clearing user session and authentication cookies.
 * It supports:
 * - Clearing access token cookie
 * - Clearing refresh token cookie
 * - Clearing user cookie
 * - Used when database mismatch is detected or session needs to be invalidated
 *
 * @module app/api/auth/clear-session/route
 * @features Session Management, Cookie Clearing, Authentication
 */

import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/clear-session
 *
 * Invalidates the current session by expiring the core session cookies. Takes
 * no request body; clears the `token`, `refreshToken`, and `user` cookies.
 * Used when a database mismatch is detected or the session must be forcefully
 * terminated server-side.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Create success response
    // ============================================================================
    const response = NextResponse.json(
      { success: true, message: 'Session cleared successfully' },
      { status: 200 }
    );

    // ============================================================================
    // STEP 2: Clear all authentication cookies
    // ============================================================================
    const cookiesToClear = ['token', 'refreshToken', 'user'];

    const clearOptions = getAuthCookieOptions(request, { expires: new Date(0) });
    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', clearOptions);
    });

    // ============================================================================
    // STEP 3: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.warn(`[Clear Session POST API] Completed in ${duration}ms`);
    }

    return response;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Clear Session POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}

