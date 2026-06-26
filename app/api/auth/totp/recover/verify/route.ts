/**
 * TOTP Recovery Verify API Route
 *
 * Validates a time-limited recovery token and generates a new TOTP secret and QR code.
 * Used during the VM 2FA recovery flow before confirming the new secret.
 *
 * @module app/api/auth/totp/recover/verify/route
 */

import {
  generateOTPAuthURI,
  generateTOTPSecret,
} from '@/app/api/lib/helpers/auth/totp';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/auth/totp/recover/verify
 *
 * Validates a time-limited recovery token that was emailed to the user during the
 * VM recovery flow. If valid, generates a new TOTP secret and QR code without
 * immediately disabling the old secret, so existing 2FA protection is maintained
 * until the new code is confirmed via POST /api/auth/totp/confirm.
 *
 * Body fields:
 * @param {string} token - Required. The recovery token from the emailed link, matched
 *                       against `totpRecoveryToken` with expiry enforced via `totpRecoveryExpires`.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/auth/totp/recover/verify';
  const user = extractUserFromRequest(req);

  try {
    const { token } = await req.json();
    if (!token) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/verify',
        'Token is required',
        user
      );
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    await connectDB();
    const foundUser = await UserModel.findOne({
      totpRecoveryToken: token,
      totpRecoveryExpires: { $gt: new Date() },
    });

    if (!foundUser) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/verify',
        'Invalid or expired recovery token',
        user
      );
      return NextResponse.json(
        { error: 'Invalid or expired recovery token' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 1: Generate NEW secret
    // ============================================================================
    const secret = generateTOTPSecret();
    const appName = 'Evolution One CMS';
    const uri = generateOTPAuthURI(
      foundUser.username || foundUser.emailAddress,
      appName,
      secret
    );
    const qrCodeUrl = await QRCode.toDataURL(uri);

    // ============================================================================
    // STEP 2: Update totpTempSecret
    // Use totpTempSecret instead of overwriting totpSecret/totpEnabled immediately
    // This allows the user to maintain their current 2FA protection until the new one is verified
    // ============================================================================
    const updateResult = await UserModel.findOneAndUpdate(
      { _id: foundUser._id },
      {
        $set: {
          totpTempSecret: secret,
          // totpRecoveryToken: null, // Keep the token for the confirm step if needed, or clear it if preferred
          // totpRecoveryExpires: null
        },
      },
      { strict: false }
    );
    if (!updateResult) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/verify',
        'Failed to save new TOTP secret',
        user
      );
      return NextResponse.json(
        { error: 'Failed to save new TOTP secret' },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'POST',
      '/api/auth/totp/recover/verify',
      1,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      secret,
      username: foundUser.username,
    });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Internal server error';
    logRouteError(
      functionName,
      'POST',
      '/api/auth/totp/recover/verify',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
