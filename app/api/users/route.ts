import {
  createUser as createUserHelper,
  deleteUser as deleteUserHelper,
  getAllUsers,
  handleAllUsersRequest,
  handleCashiersRequest,
  handleDeletedUsersRequest,
  updateUser as updateUserHelper,
} from '@/app/api/lib/helpers/users/users';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  validateEmail,
  validatePasswordStrength,
} from '@/lib/utils/validation';
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '../lib/services/loggerService';

/**
 * Main GET handler for fetching users
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser, userRoles, isAdminOrDev }) => {
    const startTime = Date.now();
    const context = apiLogger.createContext(request, '/api/users');
    apiLogger.startLogging();
    
    // Check if the assignedLicencees field exists and is a valid array
    const currentUserLicencees = Array.isArray(currentUser?.assignedLicencees) 
      ? currentUser.assignedLicencees
      : [];

    // Check if the assignedLocations field exists and is a valid array
    const currentUserLocationPermissions = Array.isArray(currentUser?.assignedLocations)
      ? (currentUser.assignedLocations as unknown[]).map(id => String(id))
      : [];

    const isManager = userRoles.includes('manager') && !isAdminOrDev;
    const isLocationAdmin = userRoles.includes('location admin') && !isAdminOrDev && !isManager;
    const isVaultManager = userRoles.includes('vault-manager') && !isAdminOrDev && !isManager;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; 
    const role = searchParams.get('role');

    if (!getAllUsers) {
      return NextResponse.json({ success: false, message: 'Service not available' }, { status: 500 });
    }

    // PURPOSE: Get deleted users
    if (status === 'deleted') {
      if (!isAdminOrDev && !isManager && !isLocationAdmin) {
        return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
      }
      return handleDeletedUsersRequest(
        currentUser,
        userRoles,
        currentUserLicencees,
        currentUserLocationPermissions,
        searchParams,
        startTime,
        context
      );
    }

    // PURPOSE: Get cashiers only
    if (role === 'cashier') {
      if (!isAdminOrDev && !isManager && !isVaultManager && !isLocationAdmin) {
        return NextResponse.json({
          success: false,
          message: 'Access denied - only admins, managers, and vault managers can access cashiers',
        }, { status: 403 });
      }
      return handleCashiersRequest(
        currentUser,
        userRoles,
        currentUserLicencees,
        currentUserLocationPermissions,
        searchParams,
        startTime,
        context
      );
    }

    // PURPOSE: Get all users (default case)
    return handleAllUsersRequest(
      currentUser,
      userRoles,
      currentUserLicencees,
      currentUserLocationPermissions,
      searchParams,
      startTime,
      context
    );
  });
}


/**
 * Main POST handler for creating a new user
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async () => {
    const body = await request.json();

    const {
      username,
      emailAddress,
      password,
      roles = [],
      profile = {},
      isEnabled = true,
      profilePicture = null,
      assignedLocations,
      assignedLicencees,
      tempPassword,
      multiplier,
    } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ success: false, message: 'Username is required' }, { status: 400 });
    }

    if (!emailAddress || !validateEmail(emailAddress)) {
      return NextResponse.json({ success: false, message: 'Valid email is required' }, { status: 400 });
    }

    if (!profile || !profile.gender) {
      return NextResponse.json({ success: false, message: 'Gender is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ success: false, message: 'Password is required' }, { status: 400 });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: `Password requirements not met: ${passwordValidation.feedback.join(', ')}`,
      }, { status: 400 });
    }

    try {
      const userWithoutPassword = await createUserHelper(
        {
          username,
          emailAddress,
          password,
          roles,
          profile,
          isEnabled,
          profilePicture,
          assignedLocations,
          assignedLicencees,
          tempPassword,
          multiplier,
        },
        request
      );

      return NextResponse.json({ success: true, user: userWithoutPassword }, { status: 201 });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      const isConflictError = errorMsg.includes('already exists');
      return NextResponse.json({
        success: false,
        message: isConflictError ? errorMsg : 'User creation failed',
        error: errorMsg,
      }, { status: isConflictError ? 409 : 500 });
    }
  });
}

/**
 * Main PUT handler for updating a user
 */
export async function PUT(request: NextRequest) {
  return withApiAuth(request, async () => {
    const body = await request.json();
    const { _id, ...updateFields } = body;

    if (!_id) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    try {
      const updatedUser = await updateUserHelper(_id, updateFields, request);
      const userObject = updatedUser.toObject ? updatedUser.toObject() : updatedUser;

      const formattedUser = {
        ...userObject,
        assignedLocations: userObject.assignedLocations || undefined,
        assignedLicencees: userObject.assignedLicencees || undefined,
      };

      return NextResponse.json({ success: true, user: formattedUser });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      const isConflictError = errorMsg.includes('already exists');
      const isNotFoundError = errorMsg === 'User not found';
      
      return NextResponse.json({
        success: false,
        message: isNotFoundError || isConflictError ? errorMsg : 'Update failed',
        error: errorMsg,
      }, { status: isNotFoundError ? 404 : (isConflictError ? 409 : 500) });
    }
  });
}

/**
 * Main DELETE handler for deleting a user
 */
export async function DELETE(request: NextRequest) {
  return withApiAuth(request, async () => {
    const body = await request.json();
    const { _id } = body;

    if (!_id) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    try {
      await deleteUserHelper(_id, request);
      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      const isNotFoundError = errorMsg === 'User not found';
      
      return NextResponse.json({
        success: false,
        message: isNotFoundError ? errorMsg : 'Delete failed',
        error: errorMsg,
      }, { status: isNotFoundError ? 404 : 500 });
    }
  });
}

