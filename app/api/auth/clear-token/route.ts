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

import { NextResponse } from 'next/server';

/**
 * Main POST handler for clearing authentication token
 *
 * Flow:
 * 1. Create success response
 * 2. Clear token cookie
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
      message: 'Token cleared successfully. Please login again.',
    });

    // ============================================================================
    // STEP 2: Clear token cookie
    // ============================================================================
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Consistent with login cookie settings
      maxAge: 0, // Expire immediately
      path: '/',
    });

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

