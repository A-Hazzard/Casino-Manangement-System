/**
 * Send Welcome Email API Route
 *
 * API route for sending welcome emails to new cashiers.
 * Uses the EmailService to send professionally formatted HTML emails.
 *
 * @module app/api/email/send-welcome/route
 */

import { emailService } from '@/app/api/lib/services/emailService';
import { NextRequest, NextResponse } from 'next/server';

type WelcomeEmailRequest = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
};

/**
 * POST handler for sending welcome emails
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as WelcomeEmailRequest;

    // Validate required fields
    if (
      !body.firstName ||
      !body.lastName ||
      !body.username ||
      !body.email ||
      !body.tempPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: firstName, lastName, username, email, tempPassword',
        },
        { status: 400 }
      );
    }

    // Send welcome email using EmailService
    const result = await emailService.sendCashierWelcomeEmail({
      firstName: body.firstName,
      lastName: body.lastName,
      username: body.username,
      email: body.email,
      tempPassword: body.tempPassword,
      loginUrl: body.loginUrl,
    });

    // Log success for debugging
    if (result.success) {
      console.log(
        `✅ Welcome email sent successfully to ${body.email} (${Date.now() - startTime}ms)`
      );
    } else {
      console.error(
        `❌ Failed to send welcome email to ${body.email}:`,
        result.error
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Send welcome email API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send welcome email',
      },
      { status: 500 }
    );
  }
}
