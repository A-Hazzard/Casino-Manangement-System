import { verifyTOTPCode } from '@/app/api/lib/helpers/auth/totp';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/totp/confirm
 * 
 * Verifies the first TOTP code and activates the authenticator for the user.
 * 
 * Request body:
 * {
 *   "token": "123456"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    await connectDB();
    const user = await UserModel.findById(session._id);
    if (!user || !user.totpSecret) {
      return NextResponse.json({ error: 'Setup not initiated' }, { status: 400 });
    }

    const isValid = verifyTOTPCode(token, user.totpSecret);
    if (isValid) {
      user.totpEnabled = true;
      await user.save();
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('TOTP Confirm Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
