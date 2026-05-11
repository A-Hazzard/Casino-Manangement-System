import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * GET /api/auth/totp/status
 *
 * Returns the 2FA configuration state for the currently authenticated user. Takes
 * no query params; identity is derived from the session cookie. Returns whether
 * `totpEnabled` is set, whether a secret exists, and the user's primary role and
 * email — used by the frontend to decide which setup or recovery flow to show.
 */
export async function GET() {
  const startTime = Date.now();
  const functionName = 'GET /api/auth/totp/status';
  const user = extractUserFromRequest(null);

  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      logRouteError(
        functionName,
        'GET',
        '/api/auth/totp/status',
        'Unauthorized',
        user
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const foundUser = await UserModel.findOne({ _id: session._id }).select(
      'totpEnabled totpSecret roles emailAddress'
    );

    if (!foundUser) {
      logRouteError(
        functionName,
        'GET',
        '/api/auth/totp/status',
        'User not found',
        user
      );
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/auth/totp/status',
      1,
      user,
      duration
    );

    return NextResponse.json({
      enabled: !!foundUser.totpEnabled,
      hasSecret: !!foundUser.totpSecret,
      needsSetup: !foundUser.totpEnabled,
      role: foundUser.roles?.[0] || 'cashier',
      email: foundUser.emailAddress,
    });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/auth/totp/status',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
