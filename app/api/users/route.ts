/**
 * Users API Route
 *
 * This route handles user management operations including fetching, creating, updating, and deleting users.
 * It supports:
 * - Role-based access control (Admin, Manager, Location Admin, Vault Manager, Cashier & Developer)
 * - Licensee-based filtering
 * - Location permission filtering
 * - Search functionality (username, email, _id, or all)
 * - Pagination
 * - User creation with validation
 * - User updates with permission checks
 *
 * @module app/api/users/route
 */

// Helpers
import {
  createUser as createUserHelper,
  deleteUser as deleteUserHelper,
  getAllUsers,
  getUserFromServer,
  handleAllUsersRequest,
  handleCashiersRequest,
  handleDeletedUsersRequest,
  updateUser as updateUserHelper,
} from '@/app/api/lib/helpers/users/users';
// Types
// Utilities
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  validateEmail,
  validatePasswordStrength,
} from '@/lib/utils/validation';
import { NextRequest } from 'next/server';
import { apiLogger } from '../lib/services/loggerService';

/**
 * Main GET handler for fetching users
 *
 * Flow:
 * 1. Initialize API logging
 * 2. Connect to database
 * 3. Get current user and permissions
 * 4. Parse query parameters (licensee, search, searchMode, status, role, pagination)
 * 5. Route to appropriate handler based on request purpose
 * 6. Return paginated user list
 */
export async function GET(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    await connectDB();

    // ============================================================================
    // STEP 1: Get current user and permissions
    // ============================================================================
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];

    // Check if the assignedLicensees field exists and is a valid array before assigning
    let currentUserLicensees: string[] = [];
    if (Array.isArray(currentUser?.assignedLicensees)) {
      currentUserLicensees = currentUser?.assignedLicensees;
    }

    // Check if the assignedLocations field exists and is a valid array before assigning
    let currentUserLocationPermissionsRaw: unknown[] = [];
    if (Array.isArray(currentUser?.assignedLocations)) {
      currentUserLocationPermissionsRaw = currentUser?.assignedLocations;
    }
    const currentUserLocationPermissions =
      currentUserLocationPermissionsRaw.map(id => String(id));

    // ============================================================================
    // STEP 2: Determine user roles and permissions
    // ============================================================================
    const isAdmin =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer');
    const isManager = currentUserRoles.includes('manager') && !isAdmin;
    const isLocationAdmin =
      currentUserRoles.includes('location admin') && !isAdmin && !isManager;
    const isVaultManager =
      currentUserRoles.includes('vault-manager') && !isAdmin && !isManager;

    console.warn('[USERS API] Current User Info:', {
      username: currentUser?.username,
      roles: currentUserRoles,
      licensees: currentUserLicensees,
      locationPermissionsRaw: currentUserLocationPermissionsRaw,
      locationPermissions: currentUserLocationPermissions,
      isAdmin,
      isManager,
      isLocationAdmin,
      isVaultManager,
    });

    // ============================================================================
    // STEP 3: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // 'all', 'active', 'disabled', 'deleted'
    const role = searchParams.get('role'); // Optional role filter

    // Validate service availability
    if (!getAllUsers) {
      console.error('[Function:getAllUsers] No Users Found');
      return new Response(
        JSON.stringify({ success: false, message: 'Service not available' }),
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 4: Route to appropriate handler based on request purpose
    // ============================================================================

    // PURPOSE: Get deleted users
    if (status === 'deleted') {
      // Only admins, managers, and developers can access deleted users
      if (!isAdmin && !isManager && !isLocationAdmin) {
        return new Response(
          JSON.stringify({ success: false, message: 'Access denied' }),
          { status: 403 }
        );
      }
      return handleDeletedUsersRequest(
        currentUser,
        currentUserRoles,
        currentUserLicensees,
        currentUserLocationPermissions,
        searchParams,
        startTime,
        context
      );
    }

    // PURPOSE: Get cashiers only
    if (role === 'cashier') {
      if (!isAdmin && !isManager && !isVaultManager && !isLocationAdmin) {
        return new Response(
          JSON.stringify({
            success: false,
            message:
              'Access denied - only admins, managers, and vault managers can access cashiers',
          }),
          { status: 403 }
        );
      }
      return handleCashiersRequest(
        currentUser,
        currentUserRoles,
        currentUserLicensees,
        currentUserLocationPermissions,
        searchParams,
        startTime,
        context
      );
    }

    // PURPOSE: Get all users (default case)
    return handleAllUsersRequest(
      currentUser,
      currentUserRoles,
      currentUserLicensees,
      currentUserLocationPermissions,
      searchParams,
      startTime,
      context
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Users API] GET error after ${duration}ms:`, errorMessage);
    apiLogger.logError(context, 'Failed to fetch users', errorMessage);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to fetch users' }),
      { status: 500 }
    );
  }
}

/**
 * Main POST handler for creating a new user
 *
 * Flow:
 * 1. Initialize API logging
 * 2. Connect to database
 * 3. Parse request body
 * 4. Validate required fields (username, email, password)
 * 5. Validate email format
 * 6. Validate password strength
 * 7. Create user via helper function
 * 8. Return created user data
 */
export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
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
      assignedLicensees,
    } = body;

    // ============================================================================
    // STEP 3: Validate required fields
    // ============================================================================
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

    // ============================================================================
    // STEP 4: Validate email format
    // ============================================================================
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

    // ============================================================================
    // STEP 5: Validate password strength
    // ============================================================================
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

    // ============================================================================
    // STEP 6: Create user via helper function
    // ============================================================================
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
        assignedLicensees,
      },
      request
    );

    // ============================================================================
    // STEP 7: Return created user data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Users API] POST completed in ${duration}ms`);
    }

    apiLogger.logSuccess(
      context,
      `Successfully created user ${username} with email ${emailAddress}`
    );
    return new Response(
      JSON.stringify({ success: true, user: userWithoutPassword }),
      { status: 201 }
    );
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Users API] POST error after ${duration}ms:`, errorMsg);
    apiLogger.logError(context, 'User creation failed', errorMsg);

    const isConflictError =
      errorMsg === 'Username already exists' ||
      errorMsg === 'Email already exists' ||
      errorMsg === 'Username and email already exist';

    return new Response(
      JSON.stringify({
        success: false,
        message: isConflictError ? errorMsg : 'User creation failed',
        error: errorMsg,
      }),
      { status: isConflictError ? 409 : 500 }
    );
  }
}

/**
 * Main PUT handler for updating a user
 *
 * Flow:
 * 1. Initialize API logging
 * 2. Connect to database
 * 3. Parse request body
 * 4. Validate user ID
 * 5. Update user via helper function
 * 6. Return updated user data
 */
export async function PUT(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const body = await request.json();
    const { _id, ...updateFields } = body;

    // ============================================================================
    // STEP 3: Validate user ID
    // ============================================================================
    if (!_id) {
      apiLogger.logError(context, 'User update failed', 'User ID is required');
      return new Response(
        JSON.stringify({ success: false, message: 'User ID is required' }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Update user via helper function
    // ============================================================================
    const updatedUser = await updateUserHelper(_id, updateFields, request);

    // ============================================================================
    // STEP 5: Convert Mongoose document to plain object
    // ============================================================================
    const userObject = updatedUser.toObject
      ? updatedUser.toObject()
      : updatedUser;

    const formattedUser = {
      ...userObject,
      assignedLocations: userObject.assignedLocations || undefined,
      assignedLicensees: userObject.assignedLicensees || undefined,
    };

    // ============================================================================
    // STEP 6: Return updated user data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Users API] PUT completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully updated user ${_id}`);
    return new Response(
      JSON.stringify({ success: true, user: formattedUser }),
      {
        status: 200,
      }
    );
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Users API] PUT error after ${duration}ms:`, errorMsg);
    apiLogger.logError(context, 'User update failed', errorMsg);

    const isConflictError =
      errorMsg === 'Username already exists' ||
      errorMsg === 'Email already exists';

    const isValidationError =
      errorMsg.includes('cannot be empty') ||
      errorMsg.includes('is required') ||
      errorMsg.includes('must be') ||
      errorMsg.includes('Invalid') ||
      errorMsg.includes('already exists') ||
      errorMsg === 'User not found';

    return new Response(
      JSON.stringify({
        success: false,
        message:
          isValidationError || isConflictError ? errorMsg : 'Update failed',
        error: errorMsg,
      }),
      {
        status:
          errorMsg === 'User not found'
            ? 404
            : isConflictError
              ? 409
              : isValidationError
                ? 400
                : 500,
      }
    );
  }
}

/**
 * Main DELETE handler for deleting a user
 *
 * Flow:
 * 1. Initialize API logging
 * 2. Connect to database
 * 3. Parse request body
 * 4. Validate user ID
 * 5. Delete user via helper function
 * 6. Return success response
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const body = await request.json();
    const { _id } = body;

    // ============================================================================
    // STEP 3: Validate user ID
    // ============================================================================
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

    // ============================================================================
    // STEP 4: Delete user via helper function
    // ============================================================================
    await deleteUserHelper(_id, request);

    // ============================================================================
    // STEP 5: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Users API] DELETE completed in ${duration}ms`);
    }

    apiLogger.logSuccess(context, `Successfully deleted user ${_id}`);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Users API] DELETE error after ${duration}ms:`, errorMsg);
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
