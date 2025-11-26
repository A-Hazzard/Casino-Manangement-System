/**
 * Check Username API Route
 *
 * This route checks if a username or email already exists in the system.
 * It supports:
 * - Username availability checking
 * - Email address checking
 * - Duplicate prevention for user creation
 *
 * @module app/api/users/check-username/route
 */

import User from '@/app/api/lib/models/user';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for checking username availability
 *
 * Flow:
 * 1. Connect to database
 * 2. Extract username from query parameters
 * 3. Validate username parameter
 * 4. Check if username or email exists
 * 5. Return availability status
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Extract username from query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    // ============================================================================
    // STEP 3: Validate username parameter
    // ============================================================================
    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Check if username or email exists
    // ============================================================================
    const existingUser = await User.findOne({
      $or: [{ username: username }, { emailAddress: username }],
    });

    // ============================================================================
    // STEP 5: Return availability status
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 500) {
      console.warn(`[Check Username API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      exists: !!existingUser,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Check Username API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
