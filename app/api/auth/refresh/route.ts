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

import { refreshAccessToken } from '@/app/api/lib/helpers/auth';
import { getFriendlyErrorMessage } from '@/lib/utils/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for refreshing access token
 *
 * Flow:
 * 1. Parse refresh token from request body or cookies
 * 2. Validate refresh token presence
 * 3. Refresh access token using refresh token
 * 4. Set new access token as HTTP-only cookie
 * 5. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
      return NextResponse.json(result, { status: 401 });
    }

    // ============================================================================
    // STEP 4: Set new access token as HTTP-only cookie
    // ============================================================================
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });

    response.cookies.set('token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 60 minutes (1 hour)
    });

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 500) {
      console.warn(`[Refresh API] Completed in ${duration}ms`);
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = getFriendlyErrorMessage(
      error instanceof Error ? error.message : 'Token refresh failed'
    );
    console.error(`[Refresh API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
