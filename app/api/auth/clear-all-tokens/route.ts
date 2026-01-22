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

import { NextResponse } from 'next/server';

/**
 * Main POST handler for clearing all tokens
 *
 * Flow:
 * 1. Create success response
 * 2. Clear all token-related cookies
 * 3. Return success response
 */
export async function POST() {
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

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/',
      });
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
 * GET endpoint for easy browser access
 * Delegates to POST handler
 */
export async function GET() {
  return POST();
}

