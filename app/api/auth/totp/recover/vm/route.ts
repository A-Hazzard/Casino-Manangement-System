import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { send2FARecoveryEmail } from '@/lib/services/emailService';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/totp/recover/vm
 *
 * Initiates 2FA recovery for a Vault Manager (or higher).
 * Sends a unique link to their email address.
 */
export async function POST() {
  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await UserModel.findOne({ _id: session._id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Role check: must be vault-manager or admin/developer
    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const isVMOrHigher = userRoles.some((role: string) =>
      [
        'vault-manager',
        'admin',
        'developer',
        'manager',
        'location admin',
      ].includes(role.toLowerCase())
    );

    if (!isVMOrHigher) {
      return NextResponse.json(
        { error: 'Not authorized for email recovery flow' },
        { status: 403 }
      );
    }

    if (!user.emailAddress) {
      return NextResponse.json(
        { error: 'No email address found for this account' },
        { status: 400 }
      );
    }

    // Generate recovery token (expiring in 1 hour)
    const token = nanoid(32);
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    console.log(
      '[TOTP VM Recovery] Updating user:',
      user.username,
      'with token:',
      token
    );

    // Use strict: false to ensure fields are saved even if the schema is cached by Mongoose
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: session._id },
      {
        $set: {
          totpRecoveryToken: token,
          totpRecoveryExpires: expiry,
        },
      },
      { new: true, strict: false }
    ).lean();

    if (
      !updatedUser ||
      (updatedUser as Record<string, unknown>).totpRecoveryToken !== token
    ) {
      console.error(
        '[TOTP VM Recovery] Update failed - token not reflected in DB. UpdatedUser:',
        updatedUser
      );
      return NextResponse.json(
        { error: 'Failed to update recovery token in database' },
        { status: 500 }
      );
    }

    console.log('[TOTP VM Recovery] Database updated successfully');

    // Send email
    const emailRes = await send2FARecoveryEmail(user.emailAddress, token);

    if (emailRes.success) {
      return NextResponse.json({
        success: true,
        message: 'Recovery email sent',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send recovery email' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error(
      'TOTP VM Recovery Error:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
