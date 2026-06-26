/**
 * Update Email API Route
 *
 * Securely updates the authenticated user's email address after verifying
 * the current password. Checks for duplicate email addresses.
 *
 * @module app/api/auth/profile/update-email/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { comparePassword } from '@/app/api/lib/utils/validation';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/auth/profile/update-email
 *
 * Securely updates the authenticated user's email address. Called from the
 * profile settings form; requires the current password to prevent unauthorised
 * changes.
 *
 * Body fields:
 * @param {string} newEmail - Required. The new email address to assign to the account.
 * @param {string} password - Required. The user's current password, verified before the update is applied.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/auth/profile/update-email';
  const user = extractUserFromRequest(req);

  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/profile/update-email',
        'Unauthorized',
        user
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newEmail, password } = await req.json();

    if (!newEmail || !password) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/profile/update-email',
        'New email and password are required',
        user
      );
      return NextResponse.json(
        { error: 'New email and password are required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 1: Basic email validation
    // ============================================================================
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(newEmail)) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/profile/update-email',
        'Invalid email format',
        user
      );
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    await connectDB();

    // ============================================================================
    // STEP 2: Fetch user with password
    // ============================================================================
    const dbUser = await UserModel.findOne({ _id: session._id }).select(
      '+password'
    );
    if (!dbUser) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/profile/update-email',
        'User not found',
        user
      );
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ============================================================================
    // STEP 3: Verify password
    // ============================================================================
    const isPasswordCorrect = await comparePassword(password, dbUser.password);
    if (!isPasswordCorrect) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/profile/update-email',
        'Incorrect password',
        user
      );
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 4: Check if email is already in use
    // ============================================================================
    const existingUser = await UserModel.findOne({
      emailAddress: newEmail,
      _id: { $ne: session._id },
    });
    if (existingUser) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/profile/update-email',
        'Email already in use',
        user
      );
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Update email
    // ============================================================================
    dbUser.emailAddress = newEmail;
    await dbUser.save();

    const duration = Date.now() - startTime;
    logRouteUpdate(
      functionName,
      'POST',
      '/api/auth/profile/update-email',
      1,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      message: 'Email address updated successfully',
      email: newEmail,
    });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Internal server error';
    logRouteError(
      functionName,
      'POST',
      '/api/auth/profile/update-email',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
