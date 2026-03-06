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

/**
 * Main POST handler for user logout
 *
 * Flow:
 * 1. Create success response
 * 2. Clear access token cookie
 * 3. Clear refresh token cookie
 * 4. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
    if (duration > 100) {
      console.warn(`[Logout API] Completed in ${duration}ms`);
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Logout API] Error after ${duration}ms:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

