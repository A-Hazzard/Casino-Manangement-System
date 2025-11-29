/**
 * Check Unique Username/Email API Route
 *
 * This route checks if a username or email already exists in the database.
 * Used for real-time validation in member creation/editing forms.
 *
 * @module app/api/members/check-unique/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { Member } from '@/app/api/lib/models/members';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET handler for checking username/email uniqueness
 *
 * Flow:
 * 1. Parse query parameters (username, email, excludeId)
 * 2. Connect to database
 * 3. Check if username exists (if provided)
 * 4. Check if email exists (if provided)
 * 5. Return availability status
 */
export async function GET(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const email = searchParams.get('email');
    const excludeId = searchParams.get('excludeId'); // For edit mode - exclude current member

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Check username uniqueness
    // ============================================================================
    let usernameAvailable = true;
    if (username && username.trim()) {
      const query: Record<string, unknown> = { username: username.trim() };
      // Exclude current member if editing
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existingUsername = await Member.findOne(query);
      usernameAvailable = !existingUsername;
    }

    // ============================================================================
    // STEP 4: Check email uniqueness
    // ============================================================================
    let emailAvailable = true;
    if (email && email.trim()) {
      const query: Record<string, unknown> = {
        'profile.email': email.trim(),
      };
      // Exclude current member if editing
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existingEmail = await Member.findOne(query);
      emailAvailable = !existingEmail;
    }

    // ============================================================================
    // STEP 5: Return availability status
    // ============================================================================
    return NextResponse.json({
      usernameAvailable,
      emailAvailable,
      username: username ? username.trim() : null,
      email: email ? email.trim() : null,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('[Check Unique API] Error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

