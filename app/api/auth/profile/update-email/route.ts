import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { comparePassword } from '@/app/api/lib/utils/validation';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/profile/update-email
 *
 * Securely updates the authenticated user's email address. Called from the
 * profile settings form; requires the current password to prevent unauthorised
 * changes.
 *
 * Body fields:
 * @param newEmail {string} Required. The new email address to assign to the account.
 * @param password {string} Required. The user's current password, verified before the update is applied.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserFromServer();
    if (!session || !session._id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newEmail, password } = await req.json();

    if (!newEmail || !password) {
      return NextResponse.json({ error: 'New email and password are required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    await connectDB();

    // Fetch user with password
    const user = await UserModel.findOne({ _id: session._id }).select('+password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isPasswordCorrect = await comparePassword(password, user.password);
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Check if email is already in use
    const existingUser = await UserModel.findOne({ emailAddress: newEmail, _id: { $ne: session._id } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    // Update email
    user.emailAddress = newEmail;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Email address updated successfully',
      email: newEmail
    });
  } catch (error: unknown) {
    console.error('Update Email Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
