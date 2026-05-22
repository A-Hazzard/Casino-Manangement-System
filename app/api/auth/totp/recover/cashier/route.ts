import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { create2FARecoveryNotification } from '@/lib/helpers/vault/notifications';
import { NextResponse } from 'next/server';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * POST /api/auth/totp/recover/cashier
 *
 * Initiates 2FA recovery for a Cashier who has lost access to their authenticator
 * app. Takes no request body; identity is derived from the session cookie. Sends
 * an in-app notification to every active Vault Manager assigned to the cashier's
 * location, requesting manual 2FA reset approval.
 */
export async function POST() {
  const startTime = Date.now();
  const functionName = 'POST /api/auth/totp/recover/cashier';
  const user = extractUserFromRequest(null);

  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/cashier',
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
        '/api/auth/totp/recover/cashier',
        'User not found',
        user
      );
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const locationId = foundUser.assignedLocations?.[0];
    if (!locationId) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/cashier',
        'User has no assigned location',
        user
      );
      return NextResponse.json(
        { error: 'User has no assigned location' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 1: Find Vault Managers at this location
    // ============================================================================
    const vaultManagers = await UserModel.find({
      roles: 'vault-manager',
      assignedLocations: locationId,
      isEnabled: true,
    });

    if (vaultManagers.length === 0) {
      logRouteError(
        functionName,
        'POST',
        '/api/auth/totp/recover/cashier',
        'No Vault Managers found for location',
        user
      );
      return NextResponse.json(
        {
          error:
            'No Vault Managers found for your location. Please contact administration.',
        },
        { status: 400 }
      );
    }

    const cashierName =
      `${foundUser.profile?.firstName || ''} ${foundUser.profile?.lastName || ''}`.trim() ||
      foundUser.username;

    // ============================================================================
    // STEP 2: Send notifications to all VMs
    // ============================================================================
    for (const vm of vaultManagers) {
      await create2FARecoveryNotification(
        locationId,
        vm._id,
        foundUser._id,
        cashierName
      );
    }

    const duration = Date.now() - startTime;
    logRouteUpdate(
      functionName,
      'POST',
      '/api/auth/totp/recover/cashier',
      1,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      message: 'Help request sent to Vault Managers',
    });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Internal server error';
    logRouteError(
      functionName,
      'POST',
      '/api/auth/totp/recover/cashier',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
