import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import VaultNotificationModel from '@/app/api/lib/models/vaultNotification';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/totp/reset
 *
 * Clears the TOTP secret and disables 2FA for a target user. Restricted to
 * Vault Manager, Admin, and Developer roles. Called by a Vault Manager acting
 * on a 2FA recovery notification raised by a cashier.
 *
 * Body fields:
 * @param userId         {string} Required. The `_id` of the user whose 2FA should be reset.
 * @param notificationId {string} Optional. The `_id` of the VaultNotification to mark as
 *                                actioned once the reset completes.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserFromServer();
    if (!session || !session._id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });


    const { userId, notificationId } = await req.json();

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    await connectDB();

    // 1. Verify acting user is a VM or higher
    const actor = await UserModel.findOne({ _id: session._id });
    if (!actor) return NextResponse.json({ error: 'Actor not found' }, { status: 404 });

    const actorRoles = Array.isArray(actor.roles) ? actor.roles : [];
    const isVM = actorRoles.some((r: string) => ['vault-manager', 'admin', 'developer'].includes(r.toLowerCase()));

    if (!isVM) return NextResponse.json({ error: 'Not authorized to reset 2FA' }, { status: 403 });

    // 2. Perform reset
    const user = await UserModel.findOne({ _id: userId });
    if (!user) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

    user.totpSecret = null;
    user.totpEnabled = false;
    await user.save();

    // 3. Mark notification as actioned if provided
    if (notificationId) await VaultNotificationModel.findOneAndUpdate(
      { _id: notificationId },
      {
        status: 'actioned',
        actionedAt: new Date(),
      }
    );

    return NextResponse.json({ success: true, message: '2FA has been reset for the user' });
  } catch (error: unknown) {
    console.error('TOTP Reset Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
