import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { create2FARecoveryNotification } from '@/lib/helpers/vault/notifications';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/totp/recover/cashier
 *
 * Initiates 2FA recovery for a Cashier.
 * Sends a notification to all Vault Managers at the user's location.
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

    const locationId = user.assignedLocations?.[0];
    if (!locationId) {
      return NextResponse.json(
        { error: 'User has no assigned location' },
        { status: 400 }
      );
    }

    // Find Vault Managers at this location
    const vaultManagers = await UserModel.find({
      roles: 'vault-manager',
      assignedLocations: locationId,
      isEnabled: true,
    });

    if (vaultManagers.length === 0) {
      return NextResponse.json(
        {
          error:
            'No Vault Managers found for your location. Please contact administration.',
        },
        { status: 400 }
      );
    }

    const cashierName =
      `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() ||
      user.username;

    // Send notifications to all VMs
    for (const vm of vaultManagers) {
      await create2FARecoveryNotification(
        locationId,
        vm._id,
        user._id,
        cashierName
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Help request sent to Vault Managers',
    });
  } catch (error: unknown) {
    console.error(
      'TOTP Cashier Recovery Error:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
