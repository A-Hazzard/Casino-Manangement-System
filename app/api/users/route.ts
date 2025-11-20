import {
  createUser as createUserHelper,
  deleteUser as deleteUserHelper,
  getAllUsers,
  getUserFromServer,
  updateUser as updateUserHelper,
} from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { apiLogger } from '@/app/api/lib/utils/logger';
import { validateEmail } from '@/app/api/lib/utils/validation';
import { validatePasswordStrength } from '@/lib/utils/validation';
import { NextRequest } from 'next/server';

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
    const search = searchParams.get('search');
    const searchMode = searchParams.get('searchMode') || 'username'; // 'username', 'email', '_id', or 'all'

    // Get current user to check permissions
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const currentUserLicensees =
      (currentUser?.rel as { licencee?: string[] })?.licencee || [];
    const currentUserLocationPermissionsRaw =
      (
        currentUser?.resourcePermissions as {
          'gaming-locations'?: { resources?: string[] | unknown[] };
        }
      )?.['gaming-locations']?.resources || [];
    const currentUserLocationPermissions =
      currentUserLocationPermissionsRaw.map(id => String(id));

    console.warn('[USERS API] Current User Info:', {
      username: currentUser?.username,
      roles: currentUserRoles,
      licensees: currentUserLicensees,
      locationPermissionsRaw: currentUserLocationPermissionsRaw,
      locationPermissions: currentUserLocationPermissions,
      resourcePermissions: currentUser?.resourcePermissions,
    });

    const isAdmin =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer');
    const isManager = currentUserRoles.includes('manager') && !isAdmin;
    const isLocationAdmin =
      currentUserRoles.includes('location admin') && !isAdmin && !isManager;

    const users = await getAllUsers();
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[USERS API] getAllUsers result:', {
        totalUsers: users.length,
        usernames: users.slice(0, 10).map(u => u.username),
        hasAaronTest: users.some(u => u.username === 'aaronTest' || u.emailAddress === 'aaronsploit@gmail.com'),
        aaronUser: users.find(u => u.username === 'aaronTest' || u.emailAddress === 'aaronsploit@gmail.com'),
      });
    }
    
    let result = users.map(user => {
      // Convert resourcePermissions from Mongoose Map to plain object if needed
      let resourcePermissions = user.resourcePermissions;
      if (
        resourcePermissions &&
        typeof resourcePermissions === 'object' &&
        'toObject' in resourcePermissions
      ) {
        // It's a Mongoose Map, convert to plain object
        resourcePermissions = (
          resourcePermissions as { toObject: () => Record<string, unknown> }
        ).toObject();
      } else if (resourcePermissions && resourcePermissions instanceof Map) {
        // It's a native Map, convert to plain object
        resourcePermissions = Object.fromEntries(resourcePermissions);
      }

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
        resourcePermissions: resourcePermissions as
          | Record<string, unknown>
          | undefined,
        rel: user.rel,
        loginCount: user.loginCount,
        lastLoginAt: user.lastLoginAt,
        sessionVersion: user.sessionVersion,
      };
    });

    // Filter users based on requesting user's role
    if (isManager && !isAdmin) {
      // Managers can only see users with same licensees
      const beforeManagerFilter = result.length;
      result = result.filter(user => {
        const userLicensees =
          (user.rel as { licencee?: string[] })?.licencee || [];
        // User must have at least one licensee in common with the manager
        const hasCommonLicensee = userLicensees.some(userLic =>
          currentUserLicensees.includes(userLic)
        );
        
        // Debug logging for aaronTest user
        if (process.env.NODE_ENV === 'development' && 
            (user.username === 'aaronTest' || user.email === 'aaronsploit@gmail.com')) {
          console.warn('[USERS API] Manager filter check for aaronTest:', {
            username: user.username,
            email: user.email,
            userLicensees,
            currentUserLicensees,
            hasCommonLicensee,
          });
        }
        
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
        sampleUserIds: result.slice(0, 5).map(u => ({
          id: u._id,
          username: u.username,
          hasResourcePermissions: !!u.resourcePermissions,
          resourcePermissionsKeys: u.resourcePermissions
            ? Object.keys(u.resourcePermissions as Record<string, unknown>)
            : [],
        })),
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

          // Try to get location permissions from resourcePermissions (plural) or resourcePermission (singular)
          // Handle both 'gaming-locations' (kebab-case) and 'gamingLocations' (camelCase)
          const resourcePerms = user.resourcePermissions as
            | Record<string, unknown>
            | undefined;
          const resourcePerm = (
            user as { resourcePermission?: Record<string, unknown> }
          ).resourcePermission;

          let userLocationPermissionsRaw: unknown[] = [];

          // Debug: Log the structure we're working with (always log for specific usernames for debugging)
          const shouldDebugUser =
            process.env.NODE_ENV === 'development' &&
            (result.length < 20 ||
              user.username === 'llezama' ||
              user.username === 'aaron');

          if (shouldDebugUser) {
            console.warn('[USERS API] Checking user resourcePermissions:', {
              username: user.username,
              userId,
              hasResourcePermissions: !!resourcePerms,
              resourcePermissionsType: typeof resourcePerms,
              resourcePermissionsKeys: resourcePerms
                ? Object.keys(resourcePerms)
                : [],
              resourcePermissionsValue: JSON.stringify(resourcePerms, null, 2),
            });
          }

          // Try resourcePermissions['gaming-locations'] first (most common)
          if (resourcePerms?.['gaming-locations']) {
            const gamingLocs = resourcePerms['gaming-locations'] as {
              resources?: unknown[];
              entity?: string;
            };
            userLocationPermissionsRaw = Array.isArray(gamingLocs?.resources)
              ? gamingLocs.resources
              : [];

            if (shouldDebugUser) {
              console.warn('[USERS API] Found gaming-locations:', {
                username: user.username,
                userId,
                entity: gamingLocs?.entity,
                resources: userLocationPermissionsRaw,
                resourcesCount: userLocationPermissionsRaw.length,
                resourcesType: typeof gamingLocs?.resources,
                isArray: Array.isArray(gamingLocs?.resources),
                firstFewResources: userLocationPermissionsRaw.slice(0, 5),
              });
            }
          }
          // Try resourcePermissions.gamingLocations (camelCase)
          else if (resourcePerms?.gamingLocations) {
            const gamingLocs = resourcePerms.gamingLocations as {
              resources?: unknown[];
            };
            userLocationPermissionsRaw = Array.isArray(gamingLocs?.resources)
              ? gamingLocs.resources
              : [];
          }
          // Try resourcePermission.gamingLocations (singular, camelCase)
          else if (resourcePerm?.gamingLocations) {
            const gamingLocs = resourcePerm.gamingLocations as {
              resources?: unknown[];
            };
            userLocationPermissionsRaw = Array.isArray(gamingLocs?.resources)
              ? gamingLocs.resources
              : [];
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
            if (shouldDebugUser) {
              console.warn(
                '[USERS API] User filtered out (no location permissions):',
                {
                  username: user.username,
                  userId,
                  resourcePermissions: JSON.stringify(resourcePerms, null, 2),
                  resourcePermission: resourcePerm,
                }
              );
            }
            return false; // Users with no location permissions are not visible to location admins
          }

          // Check if user has any location that matches the location admin's locations
          const hasMatchingLocation = userLocationPermissions.some(userLoc =>
            normalizedCurrentLocs.includes(userLoc)
          );

          if (shouldDebugUser) {
            console.warn('[USERS API] User filter check:', {
              username: user.username,
              userId,
              userLocationPermissionsCount: userLocationPermissions.length,
              userLocationPermissionsSample: userLocationPermissions.slice(
                0,
                10
              ),
              currentUserLocationPermissions: normalizedCurrentLocs,
              hasMatchingLocation,
              matchDetails: userLocationPermissions
                .slice(0, 10)
                .map(userLoc => ({
                  userLoc,
                  matches: normalizedCurrentLocs.includes(userLoc),
                  inCurrentLocs: normalizedCurrentLocs.includes(userLoc),
                })),
              allUserLocs: userLocationPermissions,
              allCurrentLocs: normalizedCurrentLocs,
            });
          }

          return hasMatchingLocation;
        });
      }

      console.warn('[USERS API] Location Admin Filter Result:', {
        usersAfterFilter: result.length,
        usernames: result.map(u => u.username),
        userIds: result.map(u => u._id),
      });
    }

    // Filter by licensee if provided (additional filter on top of role-based filtering)
    if (licensee && licensee !== 'all') {
      result = result.filter(user => {
        const userLicensees =
          (user.rel as { licencee?: string[] })?.licencee || [];
        return userLicensees.includes(licensee);
      });
    }

    // Filter by search term if provided (before pagination to search all users)
    if (search && search.trim()) {
      const lowerSearchValue = search.toLowerCase().trim();
      const beforeSearchCount = result.length;
      result = result.filter(user => {
        if (searchMode === 'all') {
          // Search all fields: username, email, and _id
          const username = (user.username || '').toLowerCase();
          const email = (user.email || '').toLowerCase();
          const userId = String(user._id || '').toLowerCase();
          const matches = (
            username.includes(lowerSearchValue) ||
            email.includes(lowerSearchValue) ||
            userId.includes(lowerSearchValue)
          );
          
          // Debug logging for specific search terms
          if (process.env.NODE_ENV === 'development' && 
              (lowerSearchValue.includes('aaron') || lowerSearchValue.includes('aaronsploit'))) {
            console.warn('[USERS API] Search match check:', {
              searchTerm: lowerSearchValue,
              username,
              email,
              userId,
              matches,
              userUsername: user.username,
              userEmail: user.email,
            });
          }
          
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

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(requestedLimit, 100); // Cap at 100 for performance
    const skip = (page - 1) * limit;

    // Get total count before pagination
    const totalCount = result.length;

    // Apply pagination
    const paginatedUsers = result.slice(skip, skip + limit);

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

    // Check if it's a conflict error (username/email already exists)
    const isConflictError =
      errorMsg === 'Username already exists' ||
      errorMsg === 'Email already exists';

    // Check if it's a validation error (should return specific message)
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
      rel,
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
        rel,
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

    // Check if it's a conflict error (username/email already exists)
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
