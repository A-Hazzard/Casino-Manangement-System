/**
 * API Route: Send Verification SMS to a Member
 * 
 * Flow:
 * 1. Connect to Database
 * 2. Parse Query Params (memberId, phoneNumber)
 * 3. Call Send Verification SMS Helper
 * 4. Update Member with new Code and Timestamp
 * 5. Return success result
 * 
 * @module app/api/members/send-verification-sms/route
 */

import { sendVerificationSMS } from '@/app/api/lib/helpers/sms';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Connect to Database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse Query Parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    const phoneNumber = searchParams.get('phoneNumber');

    if (!memberId || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: memberId and phoneNumber' },
        { status: 400 }
      );
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Call SMS Helper Logic
    // ============================================================================
    // This helper performs both the SMS sending and the member record update.
    const data = await sendVerificationSMS(memberId, phoneNumber);

    // ============================================================================
    // STEP 4: Return Success Response
    // ============================================================================
    return NextResponse.json({
      success: true,
      message: 'Activation code sent successfully',
      data
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[SMS API] Verification failed:', errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }
}
