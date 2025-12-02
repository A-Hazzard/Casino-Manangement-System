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
 * Main GET handler for checking username and email availability
 *
 * Flow:
 * 1. Connect to database
 * 2. Extract username, email, and excludeId from query parameters
 * 3. Check if username exists (if provided)
 * 4. Check if email exists (if provided)
 * 5. Return availability status for both
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Extract parameters from query
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const email = searchParams.get('email');
    const excludeId = searchParams.get('excludeId'); // For edit mode - exclude current user

    // ============================================================================
    // STEP 3: Check username availability
    // ============================================================================
    let usernameExists = false;
    if (username && username.trim()) {
      const query: Record<string, unknown> = { username: username.trim() };
      // Exclude current user if editing
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existingUser = await User.findOne(query);
      usernameExists = !!existingUser;
    }

    // ============================================================================
    // STEP 4: Check email availability
    // ============================================================================
    let emailExists = false;
    if (email && email.trim()) {
      const query: Record<string, unknown> = { emailAddress: email.trim() };
      // Exclude current user if editing
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existingUser = await User.findOne(query);
      emailExists = !!existingUser;
    }

    // ============================================================================
    // STEP 5: Return availability status
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 500) {
      console.warn(`[Check Username API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      usernameExists,
      emailExists,
      username: username ? username.trim() : null,
      email: email ? email.trim() : null,
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
