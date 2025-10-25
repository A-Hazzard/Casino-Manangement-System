import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { hashPassword } from '@/app/api/lib/utils/validation';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { username, emailAddress, password } = await request.json();

    if (!username || !emailAddress || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username, email, and password are required',
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ username }, { emailAddress }],
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const hashedPassword = await hashPassword(password);
    const newUser = await UserModel.create({
      _id: new (
        await import('mongoose')
      ).default.Types.ObjectId().toHexString(),
      username,
      emailAddress,
      password: hashedPassword,
      roles: ['user'],
      profile: {
        firstName: 'Test',
        lastName: 'User',
      },
      isEnabled: true,
      profilePicture: null,
      resourcePermissions: {},
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
    });

    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      user: {
        _id: newUser._id,
        username: newUser.username,
        emailAddress: newUser.emailAddress,
      },
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create test user' },
      { status: 500 }
    );
  }
}
