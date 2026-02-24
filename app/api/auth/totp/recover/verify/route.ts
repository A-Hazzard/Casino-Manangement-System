import { generateOTPAuthURI, generateTOTPSecret } from '@/app/api/lib/helpers/auth/totp';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

/**
 * POST /api/auth/totp/recover/verify
 * 
 * Verifies a 2FA recovery token sent via email.
 * If valid, generates a NEW TOTP secret and QR code for the user to re-setup.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log('[TOTP Verify] Checking token:', token);
    await connectDB();
    const user = await UserModel.findOne({
      totpRecoveryToken: token,
      totpRecoveryExpires: { $gt: new Date() },
    });

    if (!user) {
      console.log('[TOTP Verify] No user found for token or token expired');
      // Let's check if the token exists at all without the expiry filter for debugging
      const userWithToken = await UserModel.findOne({ totpRecoveryToken: token });
      if (userWithToken) {
        console.log(
          '[TOTP Verify] Found user but token EXPIRED. Expiry:',
          userWithToken.totpRecoveryExpires,
          'Current:',
          new Date()
        );
      } else {
        console.log('[TOTP Verify] Token not found in database at all');
      }
      return NextResponse.json(
        { error: 'Invalid or expired recovery token' },
        { status: 400 }
      );
    }

    console.log('[TOTP Verify] User found:', user.username);

    // Generate NEW secret
    const secret = generateTOTPSecret();
    const appName = 'Evolution One CMS';
    const uri = generateOTPAuthURI(user.username || user.emailAddress, appName, secret);
    const qrCodeUrl = await QRCode.toDataURL(uri);

    // Update user using direct update to ensure fields are cleared even with cached models
    await UserModel.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          totpSecret: secret,
          totpEnabled: false,
          totpRecoveryToken: null,
          totpRecoveryExpires: null
        }
      },
      { strict: false }
    );

    console.log('[TOTP Verify] Tokens cleared and new secret saved for:', user.username);

    return NextResponse.json({ 
      success: true, 
      qrCodeUrl, 
      secret,
      username: user.username
    });
  } catch (error: any) {
    console.error('TOTP Verify Recovery Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
