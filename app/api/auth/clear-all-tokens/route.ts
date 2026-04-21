/**
 * Clear All Tokens API Route
 *
 * This route clears all authentication tokens and cookies.
 * It supports:
 * - Clearing access token cookie
 * - Clearing refresh token cookie
 * - Clearing session ID cookie
 * - Clearing user auth store cookie
 * - Useful when database context changes and tokens become invalid
 *
 * @module app/api/auth/clear-all-tokens/route
 */

import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/clear-all-tokens
 *
 * Forcefully invalidates the entire session by expiring all auth-related cookies.
 * Takes no request body; clears `token`, `refreshToken`, `sessionId`, and
 * `user-auth-store` cookies. Typically called when a database context change
 * makes existing tokens invalid. Also accessible via GET for browser redirects.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Create success response
    // ============================================================================
    const response = NextResponse.json({
      success: true,
      message: 'All tokens cleared successfully. Please login again.',
    });

    // ============================================================================
    // STEP 2: Clear all token-related cookies
    // ============================================================================
    const cookiesToClear = [
      'token',
      'refreshToken',
      'sessionId',
      'user-auth-store', // localStorage key that might be set as cookie
    ];

    const clearOptions = getAuthCookieOptions(request, { maxAge: 0 });
    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', clearOptions);
    });

    // ============================================================================
    // STEP 3: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.warn(`[Clear All Tokens API] Completed in ${duration}ms`);
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Clear All Tokens API] Error after ${duration}ms:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/clear-all-tokens
 *
 * Alias for the POST handler above; provided for browser-navigable access (e.g.
 * redirect links). Takes no params and clears the same set of cookies.
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

