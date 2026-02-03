/**
 * Forgot Password API Route
 *
 * This route handles password reset requests by sending a reset token via email.
 * It supports:
 * - Email validation
 * - Password reset email sending
 * - Secure token generation and email delivery
 *
 * @module app/api/auth/forgot-password/route
 * @features Password Reset, Email Sending, Authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { validateEmail } from '../../lib/utils/validation';

/**
 * Main POST handler for password reset requests
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate email from request body
 * 3. Validate email format
 * 4. Send password reset email
 * 5. Return result
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse and validate email from request body
    // ============================================================================
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required.' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Validate email format
    // ============================================================================
    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Send password reset email (DISABLED)
    // ============================================================================
    // const result: AuthResult = await sendPasswordResetEmail(email);
    console.log(`[Forgot Password] Reset requested for ${email}, but email services are disabled.`);

    // ============================================================================
    // STEP 5: Return result
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Forgot Password POST API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset functionality via email is currently disabled. Please contact your administrator.',
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Forgot Password POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: 'Failed to process password reset request.' },
      { status: 500 }
    );
  }
}

