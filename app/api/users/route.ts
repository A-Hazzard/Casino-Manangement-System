import { NextRequest } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { validateEmail } from '@/app/api/lib/utils/validation';
import { validatePasswordStrength } from '@/lib/utils/validation';
import {
  getAllUsers,
  createUser as createUserHelper,
  updateUser as updateUserHelper,
  deleteUser as deleteUserHelper,
} from '@/app/api/lib/helpers/users';
import { apiLogger } from '@/app/api/lib/utils/logger';

export async function GET(request: NextRequest): Promise<Response> {
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    await connectDB();

    // Ensure getAllUsers function is available
    if (!getAllUsers) {
      console.error('getAllUsers function is not available');
      return new Response(
        JSON.stringify({ success: false, message: 'Service not available' }),
        { status: 500 }
      );
    }
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get('licensee');

    const users = await getAllUsers();
    let result = users.map(user => ({
      _id: user._id,
      name: `${user.profile?.firstName ?? ''} ${
        user.profile?.lastName ?? ''
      }`.trim(),
      username: user.username,
      email: user.emailAddress,
      enabled: user.isEnabled,
      roles: user.roles,
      profilePicture: user.profilePicture ?? null,
      profile: user.profile,
      resourcePermissions: user.resourcePermissions,
    }));

    // Filter by licensee if provided
    if (licensee && licensee !== 'all') {
      // Note: This assumes users have a licensee field or relationship
      // You may need to adjust this based on your actual user data structure
      result = result.filter(() => {
        // For now, return all users since the user model may not have licensee filtering
        // This can be updated when the user model includes licensee information
        return true;
      });
    }

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${result.length} users`
    );
    return new Response(JSON.stringify({ success: true, users: result }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    apiLogger.logError(context, 'Failed to fetch users', errorMessage);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to fetch users' }),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    await connectDB();
    const body = await request.json();
    const { _id, ...updateFields } = body;

    if (!_id) {
      apiLogger.logError(context, 'User update failed', 'User ID is required');
      return new Response(
        JSON.stringify({ success: false, message: 'User ID is required' }),
        { status: 400 }
      );
    }

    const updatedUser = await updateUserHelper(_id, updateFields, request);
    apiLogger.logSuccess(context, `Successfully updated user ${_id}`);
    return new Response(JSON.stringify({ success: true, user: updatedUser }), {
      status: 200,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    apiLogger.logError(context, 'User update failed', errorMsg);
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMsg === 'User not found' ? errorMsg : 'Update failed',
        error: errorMsg,
      }),
      { status: errorMsg === 'User not found' ? 404 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    await connectDB();
    const body = await request.json();
    const { _id } = body;

    if (!_id) {
      apiLogger.logError(
        context,
        'User deletion failed',
        'User ID is required'
      );
      return new Response(
        JSON.stringify({ success: false, message: 'User ID is required' }),
        { status: 400 }
      );
    }

    await deleteUserHelper(_id, request);
    apiLogger.logSuccess(context, `Successfully deleted user ${_id}`);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    apiLogger.logError(context, 'User deletion failed', errorMsg);
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMsg === 'User not found' ? errorMsg : 'Delete failed',
        error: errorMsg,
      }),
      { status: errorMsg === 'User not found' ? 404 : 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    await connectDB();
    const body = await request.json();
    const {
      username,
      emailAddress,
      password,
      roles = [],
      profile = {},
      isEnabled = true,
      profilePicture = null,
      resourcePermissions = {},
    } = body;

    if (!username || typeof username !== 'string') {
      apiLogger.logError(
        context,
        'User creation failed',
        'Username is required'
      );
      return new Response(
        JSON.stringify({ success: false, message: 'Username is required' }),
        { status: 400 }
      );
    }
    if (!emailAddress || !validateEmail(emailAddress)) {
      apiLogger.logError(
        context,
        'User creation failed',
        'Valid email is required'
      );
      return new Response(
        JSON.stringify({ success: false, message: 'Valid email is required' }),
        { status: 400 }
      );
    }
    if (!password) {
      apiLogger.logError(
        context,
        'User creation failed',
        'Password is required'
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Password is required',
        }),
        { status: 400 }
      );
    }

    // Enhanced password validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      apiLogger.logError(
        context,
        'User creation failed',
        `Password requirements not met: ${passwordValidation.feedback.join(
          ', '
        )}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: `Password requirements not met: ${passwordValidation.feedback.join(
            ', '
          )}`,
        }),
        { status: 400 }
      );
    }

    const userWithoutPassword = await createUserHelper(
      {
        username,
        emailAddress,
        password,
        roles,
        profile,
        isEnabled,
        profilePicture,
        resourcePermissions,
      },
      request
    );

    apiLogger.logSuccess(
      context,
      `Successfully created user ${username} with email ${emailAddress}`
    );
    return new Response(
      JSON.stringify({ success: true, user: userWithoutPassword }),
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    apiLogger.logError(context, 'User creation failed', errorMsg);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          errorMsg === 'Username or email already exists'
            ? errorMsg
            : 'User creation failed',
        error: errorMsg,
      }),
      { status: errorMsg === 'Username or email already exists' ? 409 : 500 }
    );
  }
}
