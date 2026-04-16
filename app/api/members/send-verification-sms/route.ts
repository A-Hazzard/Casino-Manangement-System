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

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
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
    // STEP 3: Send SMS and update member record
    // ============================================================================
    const result = await sendVerificationSMS(memberId, phoneNumber);

    // ============================================================================
    // STEP 4: Log Activity (Success)
    // ============================================================================
    const user = await getUserFromServer();
    if (user) {
      await logActivity({
        action: 'sms_success',
        details: `Successfully sent verification SMS to ${phoneNumber} (Member ID: ${memberId}). Status: ${result.statusName}`,
        userId: String(user._id || user.id || user.sub),
        username: (user.emailAddress as string) || (user.username as string) || 'unknown',
        membershipLog: true,
        metadata: {
          resource: 'sms',
          resourceId: memberId,
          resourceName: phoneNumber,
          phone: phoneNumber,
          messageId: result.messageId,
          status: result.statusName,
          description: result.statusDescription,
        }
      });
    }

    // ============================================================================
    // STEP 5: Return Success Response
    // ============================================================================
    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      data: {
        messageId: result.messageId,
        phone: result.phone,
        status: result.statusName,
        statusDescription: result.statusDescription,
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    const phoneNumber = searchParams.get('phoneNumber');

    console.error(`[SMS API] Failed to send verification SMS to memberId ${memberId}:`, errorMessage);

    // Log Activity (Failure)
    const user = await getUserFromServer();
    if (user) {
      try {
        await logActivity({
          action: 'sms_failed',
          details: `Failed to send verification SMS to ${phoneNumber} (Member ID: ${memberId}). Error: ${errorMessage}`,
          userId: String(user._id || user.id || user.sub),
          username: (user.emailAddress as string) || (user.username as string) || 'unknown',
          membershipLog: true,
          metadata: {
            resource: 'sms',
            resourceId: memberId || 'unknown',
            resourceName: phoneNumber || 'unknown',
            error: errorMessage,
          }
        });
      } catch (logErr) {
        console.error('[SMS API] Failed to log failure activity:', logErr);
      }
    }

    // Distinguish config errors (500) from request/carrier errors (400)
    const isConfigError = errorMessage.includes('configuration missing');
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isConfigError ? 500 : 400 }
    );
  }
}
