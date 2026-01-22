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
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for refreshing token via activity monitor
 *
 * Flow:
 * 1. Extract token from cookies
 * 2. Verify current token validity
 * 3. Generate new token with same payload (keep session alive)
 * 4. Set new token as HTTP-only cookie
 * 5. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Extract token from cookies
    // ============================================================================
    const token = request.cookies.get('token')?.value;

    if (!token) {
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
      assignedLicensees: payload.assignedLicensees,
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

    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 120 * 60, // 2 hours (same as token expiration)
      path: '/',
    });

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 500) {
      console.warn(`[Refresh Token API] Completed in ${duration}ms`);
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Failed to refresh token';
    console.error(`[Refresh Token API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

