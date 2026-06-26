/**
 * TOTP VM Recovery API Route
 *
 * Initiates 2FA recovery for a Vault Manager or higher-privileged user by
 * generating a one-hour recovery token and emailing a recovery link.
 *
 * @module app/api/auth/totp/recover/vm/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { send2FARecoveryEmail } from '@/lib/services/emailService';
import type { LeanUserDocument } from 'shared/types/auth';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/auth/totp/recover/vm
 *
 * Initiates 2FA recovery for a Vault Manager or higher-privileged user who has
 * lost access to their authenticator app. Takes no request body; identity is
 * derived from the session cookie. Generates a one-hour recovery token, persists
 * it to the user document, and sends a recovery link to the account's email address.
 * Restricted to roles: vault-manager, location admin, manager, admin, developer.
 */
export async function POST() {
  const startTime = Date.now();
  const functionName = 'POST /api/auth/totp/recover/vm';
  const user = extractUserFromRequest(null);

  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/vm',
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
        '/api/auth/totp/recover/vm',
        'User not found',
        user
      );
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Role check: must be vault-manager or admin/developer
    const userRoles = Array.isArray(foundUser.roles) ? foundUser.roles : [];
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
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/vm',
        'Not authorized for email recovery flow',
        user
      );
      return NextResponse.json(
        { error: 'Not authorized for email recovery flow' },
        { status: 403 }
      );
    }

    if (!foundUser.emailAddress) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/vm',
        'No email address found for account',
        user
      );
      return NextResponse.json(
        { error: 'No email address found for this account' },
        { status: 400 }
      );
    }

    // Generate recovery token (expiring in 1 hour)
    const token = nanoid(32);
    const expiry = new Date(Date.now() + 3600000); // 1 hour

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
    ).lean<LeanUserDocument & { totpRecoveryToken?: unknown }>();

    if (!updatedUser || updatedUser.totpRecoveryToken !== token) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/vm',
        'Failed to update recovery token in database',
        user
      );
      return NextResponse.json(
        { error: 'Failed to update recovery token in database' },
        { status: 500 }
      );
    }

    // Send email
    const emailRes = await send2FARecoveryEmail(foundUser.emailAddress, token);

    if (emailRes.success) {
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'POST',
        '/api/auth/totp/recover/vm',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        message: 'Recovery email sent',
      });
    } else {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/vm',
        'Failed to send recovery email',
        user
      );
      return NextResponse.json(
        { error: 'Failed to send recovery email' },
        { status: 500 }
      );
    }
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Internal server error';
    logRouteError(
      functionName,
      'POST',
      '/api/auth/totp/recover/vm',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
