import { NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '../../lib/helpers/auth';
import { validateEmail } from '../../lib/utils/validation';
import { connectDB } from '../../lib/middleware/db';
import type { AuthResult } from '@/shared/types';

/**
 * Handles password reset requests by sending a reset token via email.
 *
 * @param request - Next.js Request object with JSON body containing `email`.
 * @returns Response indicating if the reset email was sent.
 */
export async function POST(request: Request) {
  await connectDB();
  const { email } = await request.json();

  if (!validateEmail(email)) {
    return NextResponse.json(
      { success: false, message: 'Invalid email format.' },
      { status: 400 }
    );
  }

  const result: AuthResult = await sendPasswordResetEmail(email);
  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Reset instructions sent.',
    });
  } else {
    return NextResponse.json(
      { success: false, message: result.message || 'Failed to send email.' },
      { status: 500 }
    );
  }
}
