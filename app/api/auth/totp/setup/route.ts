import {
  generateOTPAuthURI,
  generateTOTPSecret,
} from '@/app/api/lib/helpers/auth/totp';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/auth/totp/setup
 *
 * Generates a TOTP secret and QR code for the authenticated user to scan with
 * their authenticator app. Takes no request body; identity is derived from the
 * session cookie. The secret is persisted as `totpSecret` but `totpEnabled`
 * remains false until the code is confirmed via POST /api/auth/totp/confirm.
 */
export async function POST() {
  const startTime = Date.now();
  const functionName = 'POST /api/auth/totp/setup';
  const user = extractUserFromRequest(null);

  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/setup',
        'Unauthorized',
        user
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const foundUser = await UserModel.findOne({ _id: session._id });
    if (!foundUser) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/setup',
        'User not found',
        user
      );
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate secret if not exists
    let secret = foundUser.totpSecret;
    if (!secret) {
      secret = generateTOTPSecret();
      foundUser.totpSecret = secret;
      foundUser.totpEnabled = false; // Reset just in case
      await foundUser.save();
    }

    const appName = 'Evolution One CMS';
    const uri = generateOTPAuthURI(
      foundUser.username || foundUser.emailAddress,
      appName,
      secret
    );
    const qrCodeUrl = await QRCode.toDataURL(uri);

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'POST',
      '/api/auth/totp/setup',
      1,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      secret, // Also provide the text secret for manual entry
    });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Internal server error';
    logRouteError(
      functionName,
      'POST',
      '/api/auth/totp/setup',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
