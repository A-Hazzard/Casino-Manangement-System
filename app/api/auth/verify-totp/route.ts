import { verifyTOTPCode } from '@/app/api/lib/helpers/auth/totp';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/verify-totp
 * 
 * Verifies a Google Authenticator TOTP code for the current user.
 * 
 * Request body:
 * {
 *   "token": "123456"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const session = await getUserFromServer();
    if (!session || !session._id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 2. Connect to DB and fetch user
    await connectDB();
    const user = await UserModel.findOne({ _id: session._id });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Check if user has TOTP setup and enabled
    if (!user.totpSecret || !user.totpEnabled) {
      return NextResponse.json({
        error: 'Authenticator not set up',
        needsSetup: true
      }, { status: 400 });
    }

    // 4. Verify token
    const isValid = verifyTOTPCode(token, user.totpSecret);

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Verify TOTP Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
