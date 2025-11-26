/**
 * Test Current User API Route
 *
 * This route is a test endpoint to verify that authentication tokens are properly set.
 * It is used during login to confirm cookies are working before showing success message.
 *
 * @module app/api/test-current-user/route
 * @features Token Verification, Authentication Testing, Login Flow Support
 */

import { getUserIdFromServer } from '@/app/api/lib/helpers/users';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Main GET handler for verifying authentication token
 *
 * Flow:
 * 1. Get user ID from authentication token cookie
 * 2. Validate token and return user ID if valid
 * 3. Return error response if token is invalid or missing
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Get user ID from authentication token cookie
    // ============================================================================
    console.warn('🔍 [TEST-CURRENT-USER] Verifying token from cookies...');
    const userId = await getUserIdFromServer();

    console.warn('🔍 [TEST-CURRENT-USER] getUserIdFromServer result:', {
      userId: userId || 'null',
      hasUserId: !!userId,
    });

    // ============================================================================
    // STEP 2: Validate token and return user ID if valid
    // ============================================================================
    if (!userId) {
      console.warn('❌ [TEST-CURRENT-USER] No valid token found');
      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.warn(`[Test Current User GET API] Completed in ${duration}ms`);
      }
      return NextResponse.json(
        {
          success: false,
          message: 'No valid authentication token found',
          userId: null,
        },
        { status: 401 }
      );
    }

    console.warn('✅ [TEST-CURRENT-USER] Token valid, userId:', userId);

    // ============================================================================
    // STEP 3: Return success response with user ID
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.warn(`[Test Current User GET API] Completed in ${duration}ms`);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Token verified successfully',
        userId: userId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `❌ [TEST-CURRENT-USER] Token verification error after ${duration}ms:`,
      errorMessage
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
}
