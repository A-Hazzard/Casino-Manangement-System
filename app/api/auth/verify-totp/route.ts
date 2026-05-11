import { verifyTOTPCode } from '@/app/api/lib/helpers/auth/totp';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextRequest, NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/auth/verify-totp
 *
 * Verifies a live TOTP code against the authenticated user's stored secret.
 * Called at privileged action checkpoints (e.g. vault operations) where a
 * second-factor challenge is required after the user is already logged in.
 *
 * Body fields:
 * @param {string} token - Required. The current 6-digit TOTP code from the user's authenticator app.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/auth/verify-totp';
  const user = extractUserFromRequest(req);

  try {
    // 1. Authenticate user session
    const session = await getUserFromServer();
    if (!session || !session._id) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/verify-totp',
        'Unauthorized',
        user
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/verify-totp',
        'Token is required',
        user
      );
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 2. Connect to DB and fetch user
    await connectDB();
    const foundUser = await UserModel.findOne({ _id: session._id });

    if (!foundUser) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/verify-totp',
        'User not found',
        user
      );
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Check if user has TOTP setup and enabled
    if (!foundUser.totpSecret || !foundUser.totpEnabled) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/verify-totp',
        'Authenticator not set up',
        user
      );
      return NextResponse.json(
        {
          error: 'Authenticator not set up',
          needsSetup: true,
        },
        { status: 400 }
      );
    }

    // 4. Verify token
    const isValid = verifyTOTPCode(token, foundUser.totpSecret);

    if (isValid) {
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'POST',
        '/api/auth/verify-totp',
        1,
        user,
        duration
      );
      return NextResponse.json({ success: true });
    } else {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/verify-totp',
        'Invalid authenticator code',
        user
      );
      return NextResponse.json(
        { error: 'Invalid authenticator code' },
        { status: 400 }
      );
    }
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Internal server error';
    logRouteError(
      functionName,
      'POST',
      '/api/auth/verify-totp',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
