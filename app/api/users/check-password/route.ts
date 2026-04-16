/**
 * Check Password API Route
 *
 * This route allows debounced checks to see if a provided password matches
 * a user's current password or history without performing a full update.
 * Used for real-time form validation.
 *
 * @module app/api/users/check-password/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { getUserIdFromServer } from '@/app/api/lib/helpers/users/users';
import { comparePassword } from '@/app/api/lib/utils/validation';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromServer();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { password, type } = await request.json();
    if (!password) {
      return NextResponse.json({ success: true, isMatch: false });
    }

    const trimmedPassword = password.trim();
    const user = await UserModel.findOne({ _id: userId }).select('+password previousPasswords');
    
    if (!user) {
      console.log('[Check-Password] User not found for ID:', userId);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (type === 'verify') {
      const isMatch = await comparePassword(trimmedPassword, user.password || '');
      console.log('[Check-Password] Verification attempt:', {
        userId,
        passwordLength: trimmedPassword.length,
        hashLength: user.password?.length,
        isMatch
      });
      return NextResponse.json({ success: true, isMatch });
    }

    if (type === 'reuse') {
      // Check current
      const isSameAsCurrent = await comparePassword(password, user.password || '');
      if (isSameAsCurrent) {
        return NextResponse.json({ 
          success: true, 
          isReuse: true, 
          reason: 'Same as current password' 
        });
      }

      // Check history
      if (user.previousPasswords && Array.isArray(user.previousPasswords)) {
        for (const prevHashed of user.previousPasswords) {
          if (await comparePassword(password, prevHashed)) {
            return NextResponse.json({ 
              success: true, 
              isReuse: true, 
              reason: 'Already used before' 
            });
          }
        }
      }

      return NextResponse.json({ success: true, isReuse: false });
    }

    return NextResponse.json({ success: false, message: 'Invalid check type' }, { status: 400 });
  } catch (error) {
    console.error('[Check Password API] Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
