/**
 * Check Password API Route
 *
 * This route allows debounced checks to see if a provided password matches
 * a user's current password or history without performing a full update.
 * Used for real-time form validation.
 *
 * @module app/api/users/check-password/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { getUserIdFromServer } from '@/app/api/lib/helpers/users/users';
import { comparePassword } from '@/app/api/lib/utils/validation';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * Main POST handler for checking password matching
 *
 * @body {string} password - REQUIRED. The password string to check.
 * @body {string} type - REQUIRED. Check type: 'verify' (current) or 'reuse' (history).
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/users/check-password';
  const logUser = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to DB and authenticate
    // ============================================================================
    await connectDB();
    const userId = await getUserIdFromServer();
    if (!userId) {
      logRouteError(
        functionName,
        'POST',
        '/api/users/check-password',
        'Unauthorized',
        logUser
      );
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 2: Parse request
    // ============================================================================
    const { password, type } = await request.json();
    if (!password) {
      return NextResponse.json({ success: true, isMatch: false });
    }

    // ============================================================================
    // STEP 3: Fetch user with password data
    // ============================================================================
    const trimmedPassword = password.trim();
    const user = await UserModel.findOne({ _id: userId }).select(
      '+password previousPasswords'
    );

    if (!user) {
      console.log('[Check-Password] User not found for ID:', userId);
      logRouteError(
        functionName,
        'POST',
        '/api/users/check-password',
        'User not found',
        user
      );
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Handle verify check
    // ============================================================================
    if (type === 'verify') {
      const isMatch = await comparePassword(
        trimmedPassword,
        user.password || ''
      );
      console.log('[Check-Password] Verification attempt:', {
        userId,
        passwordLength: trimmedPassword.length,
        hashLength: user.password?.length,
        isMatch,
      });
      return NextResponse.json({ success: true, isMatch });
    }

    // ============================================================================
    // STEP 5: Handle reuse check
    // ============================================================================
    if (type === 'reuse') {
      // Check current
      const isSameAsCurrent = await comparePassword(
        password,
        user.password || ''
      );
      if (isSameAsCurrent) {
        return NextResponse.json({
          success: true,
          isReuse: true,
          reason: 'Same as current password',
        });
      }

      // Check history
      if (user.previousPasswords && Array.isArray(user.previousPasswords)) {
        for (const prevHashed of user.previousPasswords) {
          if (await comparePassword(password, prevHashed)) {
            return NextResponse.json({
              success: true,
              isReuse: true,
              reason: 'Already used before',
            });
          }
        }
      }

      return NextResponse.json({ success: true, isReuse: false });
    }

    // ============================================================================
    // STEP 6: Handle invalid type
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'POST',
      '/api/users/check-password',
      1,
      user,
      duration
    );
    return NextResponse.json(
      { success: false, message: 'Invalid check type' },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[Check Password API] Error:', error);
    logRouteError(
      functionName,
      'POST',
      '/api/users/check-password',
      errorMessage,
      logUser
    );
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
