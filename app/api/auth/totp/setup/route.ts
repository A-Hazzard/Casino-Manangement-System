import {
  generateOTPAuthURI,
  generateTOTPSecret,
} from '@/app/api/lib/helpers/auth/totp';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

/**
 * POST /api/auth/totp/setup
 *
 * Generates a TOTP secret and QR code for the user to scan.
 * The secret is saved as 'totpSecret' but 'totpEnabled' remains false until confirmed.
 */
export async function POST() {
  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await UserModel.findById(session._id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate secret if not exists
    let secret = user.totpSecret;
    if (!secret) {
      secret = generateTOTPSecret();
      user.totpSecret = secret;
      user.totpEnabled = false; // Reset just in case
      await user.save();
    }

    const appName = 'Evolution One CMS';
    const uri = generateOTPAuthURI(
      user.username || user.emailAddress,
      appName,
      secret
    );
    const qrCodeUrl = await QRCode.toDataURL(uri);

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      secret, // Also provide the text secret for manual entry
    });
  } catch (error: unknown) {
    console.error(
      'TOTP Setup Error:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
