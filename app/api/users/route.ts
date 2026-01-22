/**
 * Users API Route
 *
 * This route handles user management operations including fetching, creating, updating, and deleting users.
 * It supports:
 * - Role-based access control (Admin, Manager, Location Admin)
 * - Licensee-based filtering
 * - Location permission filtering
 * - Search functionality (username, email, _id, or all)
 * - Pagination
 * - User creation with validation
 * - User updates with permission checks
 *
 * @module app/api/users/route
 */

import {
  createUser as createUserHelper,
  deleteUser as deleteUserHelper,
  getAllUsers,
  getDeletedUsers,
  getUserFromServer,
  updateUser as updateUserHelper,
} from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { apiLogger } from '@/app/api/lib/utils/logger';
import { validateEmail } from '@/app/api/lib/utils/validation';
import { validatePasswordStrength } from '@/lib/utils/validation';
import { NextRequest } from 'next/server';

/**
 * Main GET handler for fetching users
 *
 * Flow:
 * 1. Initialize API logging
 * 2. Connect to database
 * 3. Parse query parameters (licensee, search, searchMode, status, role, pagination)
 * 4. Get current user and permissions
 * 5. Fetch users from database (based on status filter)
 * 6. Apply role-based filtering (Manager, Location Admin)
 * 7. Apply status filtering (Active, Disabled, Deleted)
 * 8. Apply role filtering (if role parameter provided)
 * 9. Apply licensee filtering
 * 10. Apply search filtering
 * 11. Apply pagination
 * 12. Return paginated user list
 */
export async function GET(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    if (!getAllUsers) {
      console.error('getAllUsers function is not available');
      return new Response(
        JSON.stringify({ success: false, message: 'Service not available' }),
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get('licensee');
    const search = searchParams.get('search');
    const searchMode = searchParams.get('searchMode') || 'username'; // 'username', 'email', '_id', or 'all'
    const status = searchParams.get('status') || 'all'; // 'all', 'active', 'disabled', 'deleted'
    const role = searchParams.get('role'); // Optional role filter

    // ============================================================================
    // STEP 3: Get current user and permissions
    // ============================================================================
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    // Use only new fields
    let currentUserLicensees: string[] = [];
    if (
      Array.isArray(
        (currentUser as { assignedLicensees?: string[] })?.assignedLicensees
      )
    ) {
      currentUserLicensees = (currentUser as { assignedLicensees: string[] })
        .assignedLicensees;
    }

    let currentUserLocationPermissionsRaw: unknown[] = [];
    if (
      Array.isArray(
        (currentUser as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      currentUserLocationPermissionsRaw = (
        currentUser as { assignedLocations: string[] }
      ).assignedLocations;
    }
    const currentUserLocationPermissions =
      currentUserLocationPermissionsRaw.map(id => String(id));

    console.warn('[USERS API] Current User Info:', {
      username: currentUser?.username,
      roles: currentUserRoles,
      licensees: currentUserLicensees,
      locationPermissionsRaw: currentUserLocationPermissionsRaw,
      locationPermissions: currentUserLocationPermissions,
    });

    const isAdmin =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer');
    const isManager = currentUserRoles.includes('manager') && !isAdmin;
    const isLocationAdmin =
      currentUserRoles.includes('location admin') && !isAdmin && !isManager;

    // ============================================================================
    // STEP 4: Fetch users from database based on status filter
    // ============================================================================
    let users;
    if (status === 'deleted') {
      // For deleted status, query deleted users from 2025 and later
      users = await getDeletedUsers();
    } else {
      // For all, active, or disabled, use getAllUsers (which excludes deleted)
      users = await getAllUsers();
    }

    let result = users.map(user => {
      return {
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
        assignedLocations: user.assignedLocations || undefined,
        assignedLicensees: user.assignedLicensees || undefined,
        loginCount: user.loginCount,
        lastLoginAt: user.lastLoginAt,
        sessionVersion: user.sessionVersion,
      };
    });

    // ============================================================================
    // STEP 5: Apply role-based filtering (Manager, Location Admin)
    // ============================================================================
    if (isManager && !isAdmin) {
      // Managers can only see users with same licensees
      const beforeManagerFilter = result.length;
      result = result.filter(user => {
        const userLicensees = Array.isArray(user.assignedLicensees)
          ? user.assignedLicensees
          : [];
        // User must have at least one licensee in common with the manager
        const hasCommonLicensee = userLicensees.some(userLic =>
          currentUserLicensees.includes(userLic)
        );

        return hasCommonLicensee;
      });

      if (process.env.NODE_ENV === 'development') {
        console.warn('[USERS API] Manager filter result:', {
          beforeFilter: beforeManagerFilter,
          afterFilter: result.length,
          currentUserLicensees,
        });
      }
    } else if (isLocationAdmin) {
      // Location admins can only see users who have access to at least one of their assigned locations
      const currentUserId = currentUser?._id ? String(currentUser._id) : null;

      console.warn('[USERS API] Location Admin Filter:', {
        currentUserId,
        currentUserLocationPermissions,
        currentUserLocationPermissionsCount:
          currentUserLocationPermissions.length,
        totalUsersBeforeFilter: result.length,
      });

      if (currentUserLocationPermissions.length === 0) {
        console.warn(
          '[USERS API] Location Admin has no location permissions - returning empty array'
        );
        result = [];
      } else {
        // Normalize current user's location IDs for comparison (trim only, IDs are case-sensitive)
        const normalizedCurrentLocs = currentUserLocationPermissions.map(loc =>
          String(loc).trim()
        );

        result = result.filter(user => {
          // Handle both ObjectId and String _id formats
          const userId = user._id?.toString
            ? user._id.toString()
            : String(user._id);
          const isCurrentUser = currentUserId && userId === currentUserId;

          // Always include the current user (location admin themselves)
          if (isCurrentUser) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                '[USERS API] Including current user (location admin):',
                {
                  username: user.username,
                  userId,
                }
              );
            }
            return true;
          }

          let userLocationPermissionsRaw: unknown[] = [];
          const userWithNewFields = user as { assignedLocations?: string[] };
          if (
            Array.isArray(userWithNewFields.assignedLocations) &&
            userWithNewFields.assignedLocations.length > 0
          ) {
            userLocationPermissionsRaw = userWithNewFields.assignedLocations;
          }

          // Convert all location IDs to normalized strings for comparison (trim only, IDs are case-sensitive)
          // Handle both string IDs and ObjectId objects
          const userLocationPermissions = userLocationPermissionsRaw
            .map(id => {
              // Handle ObjectId objects (from MongoDB)
              if (id && typeof id === 'object' && 'toString' in id) {
                return (id as { toString: () => string }).toString().trim();
              }
              return String(id).trim();
            })
            .filter(id => id.length > 0);

          // User must have at least one location in common with the location admin
          if (userLocationPermissions.length === 0) {
            return false; // Users with no location permissions are not visible to location admins
          }

          // Check if user has any location that matches the location admin's locations
          const hasMatchingLocation = userLocationPermissions.some(userLoc =>
            normalizedCurrentLocs.includes(userLoc)
          );

          return hasMatchingLocation;
        });
      }

      console.warn('[USERS API] Location Admin Filter Result:', {
        usersAfterFilter: result.length,
        usernames: result.map(u => u.username),
        userIds: result.map(u => u._id),
      });
    }

    // ============================================================================
    // STEP 5.5: Apply status filtering (Active, Disabled, Deleted)
    // ============================================================================
    if (status !== 'all') {
      if (status === 'active') {
        // Active: isEnabled === true and not deleted (already filtered by getAllUsers)
        result = result.filter(user => user.enabled === true);
      } else if (status === 'disabled') {
        // Disabled: isEnabled === false and not deleted (already filtered by getAllUsers)
        result = result.filter(user => user.enabled === false);
      }
      // For 'deleted' status, users are already filtered by getDeletedUsers query above
    }

    // ============================================================================
    // STEP 5.6: Apply role filtering
    // ============================================================================
    if (role && role !== 'all') {
      result = result.filter(user => {
        const userRoles = Array.isArray(user.roles) ? user.roles : [];
        return userRoles.some(
          userRole =>
            typeof userRole === 'string' &&
            userRole.toLowerCase() === role.toLowerCase()
        );
      });
    }

    // ============================================================================
    // STEP 6: Apply licensee filtering
    // ============================================================================
    if (licensee && licensee !== 'all') {
      result = result.filter(user => {
        const userLicensees = Array.isArray(user.assignedLicensees)
          ? user.assignedLicensees
          : [];
        return userLicensees.includes(licensee);
      });
    }

    // ============================================================================
    // STEP 7: Apply search filtering
    // ============================================================================
    if (search && search.trim()) {
      const lowerSearchValue = search.toLowerCase().trim();
      const beforeSearchCount = result.length;
      result = result.filter(user => {
        if (searchMode === 'all') {
          // Search all fields: username, email, and _id
          const username = (user.username || '').toLowerCase();
          const email = (user.email || '').toLowerCase();
          const userId = String(user._id || '').toLowerCase();
          const matches =
            username.includes(lowerSearchValue) ||
            email.includes(lowerSearchValue) ||
            userId.includes(lowerSearchValue);

          return matches;
        } else if (searchMode === 'username') {
          const username = user.username || '';
          return username.toLowerCase().includes(lowerSearchValue);
        } else if (searchMode === 'email') {
          // Check both email and emailAddress fields (API returns email, but user object has emailAddress)
          const email = user.email || '';
          return email.toLowerCase().includes(lowerSearchValue);
        } else if (searchMode === '_id') {
          const userId = String(user._id || '').toLowerCase();
          return userId.includes(lowerSearchValue);
        }
        return false;
      });

      if (process.env.NODE_ENV === 'development') {
        console.warn('[USERS API] Search filter:', {
          searchTerm: lowerSearchValue,
          searchMode,
          beforeSearchCount,
          afterSearchCount: result.length,
          usernames: result.slice(0, 10).map(u => u.username),
        });
      }
    }

    // ============================================================================
    // STEP 7.5: Filter out current user from results
    // ============================================================================
    const currentUserId = currentUser?._id ? String(currentUser._id) : null;
    if (currentUserId) {
      result = result.filter(user => {
        const userId = user._id?.toString
          ? user._id.toString()
          : String(user._id);
        return userId !== currentUserId;
      });
    }

    // ============================================================================
    // STEP 8: Apply pagination
    // ============================================================================
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(requestedLimit, 100); // Cap at 100 for performance
    const skip = (page - 1) * limit;

    const totalCount = result.length;
    const paginatedUsers = result.slice(skip, skip + limit);

    // ============================================================================
    // STEP 9: Return paginated user list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(`[Users API] GET completed in ${duration}ms`);
    }

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${totalCount} users (returning ${paginatedUsers.length} on page ${page})`
    );
    return new Response(
      JSON.stringify({
        success: true,
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
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

