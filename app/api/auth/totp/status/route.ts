import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextResponse } from 'next/server';

/**
 * GET /api/auth/totp/status
 *
 * Returns the 2FA configuration state for the currently authenticated user. Takes
 * no query params; identity is derived from the session cookie. Returns whether
 * `totpEnabled` is set, whether a secret exists, and the user's primary role and
 * email — used by the frontend to decide which setup or recovery flow to show.
 */
export async function GET() {
  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await UserModel.findOne({ _id: session._id }).select(
      'totpEnabled totpSecret roles emailAddress'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      enabled: !!user.totpEnabled,
      hasSecret: !!user.totpSecret,
      needsSetup: !user.totpEnabled,
      role: user.roles?.[0] || 'cashier',
      email: user.emailAddress,
    });
  } catch (error: unknown) {
    console.error(
      'TOTP Status Error:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
