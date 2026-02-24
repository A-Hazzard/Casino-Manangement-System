import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import VaultNotificationModel from '@/app/api/lib/models/vaultNotification';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/totp/reset
 * 
 * Resets 2FA for a specific user.
 * Restricted to Vault Managers and higher.
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
  } catch (error: any) {
    console.error('TOTP Reset Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
