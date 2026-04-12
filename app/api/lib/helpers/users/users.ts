import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import UserModel from '@/app/api/lib/models/user';
import { getCurrentDbConnectionString, getJwtSecret } from '@/lib/utils/auth';
import { getClientIP } from '@/lib/utils/ipAddress';
import { isValidDateInput, validateAlphabeticField, validateNameField, validateOptionalGender } from '@/lib/utils/validation';
import { JWTPayload, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { LeanUserDocument } from '../../../../../shared/types/auth';
import { CurrentUser, OriginalUserType } from '../../../../../shared/types/users';
import { connectDB } from '../../middleware/db';
import { apiLogger, LogContext } from '../../services/loggerService';
import { comparePassword, hashPassword } from '../../utils/validation';
import { logActivity } from '../activityLogger';

/**
 * Validates database context from JWT token
 */
function validateDatabaseContext(
  tokenPayload: Record<string, unknown>
): boolean {
  if (!tokenPayload.dbContext) {
    console.warn(
      'JWT token missing database context - forcing re-authentication'
    );
    return false;
  }

  const currentDbContext = {
    connectionString: getCurrentDbConnectionString(),
  };

  const tokenDbContext = tokenPayload.dbContext as {
    connectionString?: string;
  };

  // Check if database context has changed
  if (tokenDbContext.connectionString !== currentDbContext.connectionString) {
    console.warn('Database context mismatch - forcing re-authentication', {
      tokenContext: tokenDbContext,
      currentContext: currentDbContext,
    });

    // In development, provide helpful message
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '🔧 Development mode: Database context mismatch detected. This usually happens when MONGODB_URI changes. Clear your browser cookies and login again.'
      );
    }

    return false;
  }

  return true;
}

/**
 * Server-side function to get user from JWT token in cookies or Authorization header
 */
export async function getUserFromServer(): Promise<JWTPayload | null> {
  // Try to get token from cookies first
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;

  // If not in cookies, try Authorization header (for client-side axios requests)
  if (!token) {
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      const authHeader = headersList.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    } catch (error) {
      // Headers might not be available in all contexts
      console.debug('Could not read headers:', error);
    }
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(getJwtSecret())
    );

    // Validate database context
    if (!validateDatabaseContext(payload)) {
      console.warn(
        'Database context validation failed - token invalid for current database'
      );
      return null;
    }

    const jwtPayload = payload as JWTPayload & {
      roles?: string[];
      permissions?: string[];
      assignedLocations?: string[];
      assignedLicencees?: string[];
    };

    let dbUser: {
      sessionVersion?: number;
      roles?: string[];
      permissions?: string[];
      assignedLocations?: string[];
      assignedLicencees?: string[];
      isEnabled?: boolean;
      deletedAt?: Date | null;
      multiplier?: number | null;
    } | null = null;

    if (jwtPayload._id) {
      try {
        await connectDB();
        const UserModel = (await import('@/app/api/lib/models/user')).default;
        dbUser = (await UserModel.findOne({ _id: jwtPayload._id })
          .select(
            'sessionVersion roles permissions assignedLocations assignedLicencees isEnabled deletedAt multiplier'
          )
          .lean()) as {
            sessionVersion?: number;
            roles?: string[];
            permissions?: string[];
            assignedLocations?: string[];
            assignedLicencees?: string[];
            isEnabled?: boolean;
            deletedAt?: Date | null;
            multiplier?: number | null;
          } | null;

        // If user doesn't exist in database (hard deleted), invalidate session
        if (!dbUser) {
          console.warn(
            `[SESSION INVALIDATION] User ${jwtPayload._id} not found in database - user may have been deleted`
          );
          return null;
        }

        // Check if user is soft-deleted (deletedAt >= 2025)
        // Only reject users with deletedAt set to 2025 or later
        // Users without deletedAt or with deletedAt < 2025 can still use their session
        if (dbUser.deletedAt) {
          const year2025Start = new Date('2025-01-01T00:00:00.000Z');
          const deletedAtDate =
            dbUser.deletedAt instanceof Date
              ? dbUser.deletedAt
              : new Date(dbUser.deletedAt);

          // Only invalidate session if deletedAt is >= 2025
          if (deletedAtDate >= year2025Start) {
            console.warn(
              `[SESSION INVALIDATION] User ${jwtPayload._id} has been deleted (soft delete, 2025+)`
            );
            return null;
          }
        }

        // Check if user is disabled
        if (dbUser.isEnabled === false) {
          console.warn(
            `[SESSION INVALIDATION] User ${jwtPayload._id} account is disabled`
          );
          return null;
        }

        if (
          jwtPayload.sessionVersion !== undefined &&
          dbUser?.sessionVersion !== undefined &&
          dbUser.sessionVersion !== jwtPayload.sessionVersion
        ) {
          console.warn(
            `[SESSION INVALIDATION] User ${jwtPayload._id} session version mismatch. DB: ${dbUser.sessionVersion}, JWT: ${jwtPayload.sessionVersion}`
          );
          return null;
        }
      } catch (error) {
        console.error(
          'Session version validation / user hydration failed:',
          error
        );
        return null;
      }
    }

    if (!jwtPayload.sessionVersion && dbUser?.sessionVersion !== undefined) {
      jwtPayload.sessionVersion = dbUser.sessionVersion;
    }

    if (dbUser) {
      if (!jwtPayload.roles && Array.isArray(dbUser.roles)) {
        jwtPayload.roles = dbUser.roles;
      }

      if (!jwtPayload.permissions && dbUser.permissions) {
        jwtPayload.permissions = dbUser.permissions;
      }

      // Hydrate assignedLocations and assignedLicencees from database
      // ALWAYS prefer database values (database is source of truth)
      // Only log in development and only when there's an issue
      if (process.env.NODE_ENV === 'development') {
        const jwtHasLocations = Array.isArray(jwtPayload.assignedLocations);
        const dbHasLocations = Array.isArray(dbUser.assignedLocations);
        if (
          jwtHasLocations &&
          !dbHasLocations &&
          jwtPayload.assignedLocations
        ) {
          console.warn(
            `[getUserFromServer] JWT has ${jwtPayload.assignedLocations.length} locations but DB doesn't - using JWT`
          );
        }
      }

      // ALWAYS use database value if it exists (even if empty array)
      if (Array.isArray(dbUser.assignedLocations)) {
        // Database has data (even if empty) - ALWAYS use it (database is source of truth)
        const dbLocations = dbUser.assignedLocations.map((id: string) =>
          String(id)
        );
        jwtPayload.assignedLocations = dbLocations;
      } else if (Array.isArray(jwtPayload.assignedLocations)) {
        // JWT has data but DB doesn't - keep JWT data
        // (This shouldn't happen after migration, but handle gracefully)
      } else {
        // No data in JWT or DB - ensure empty array is set
        jwtPayload.assignedLocations = [];
      }

      // ALWAYS use database value if it exists (even if empty array)
      if (Array.isArray(dbUser.assignedLicencees)) {
        // Database has data (even if empty) - ALWAYS use it (database is source of truth)
        const dbLicencees = dbUser.assignedLicencees.map((id: string) =>
          String(id)
        );
        jwtPayload.assignedLicencees = dbLicencees;
      } else if (Array.isArray(jwtPayload.assignedLicencees)) {
        // JWT has data but DB doesn't - keep JWT data
      } else {
        // No data in JWT or DB - ensure empty array is set
        jwtPayload.assignedLicencees = [];
      }

      // ALWAYS use database value for multiplier (source of truth — may have changed since login)
      (jwtPayload as Record<string, unknown>).multiplier = dbUser.multiplier ?? null;
    }

    return jwtPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Server-side function to get user ID from JWT token
 */
export async function getUserIdFromServer(): Promise<string | null> {
  const user: JWTPayload | null = await getUserFromServer();
  if (user) {
    // console.log("Extracted user ID from JWT:", user._id);
    // console.log("JWT payload:", user);
  }
  return user ? (user._id as string) : null;
}

/**
 * Retrieves all users from database
 */
export async function getAllUsers() {
  return await UserModel.find(
    {
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    },
    '-password'
  ).lean(); // Get plain JavaScript objects instead of Mongoose documents
}

/**
 * Retrieves deleted users from 2025 and later
 * This is used when filtering for deleted users
 */
export async function getDeletedUsers() {
  const year2025Start = new Date('2025-01-01T00:00:00.000Z');
  return await UserModel.find(
    {
      deletedAt: { $gte: year2025Start },
    },
    '-password'
  ).lean();
}

/**
 * Retrieves a user by ID from database
 * Note: _id is stored as String in the schema, not ObjectId
 * Uses .lean() to return a plain JavaScript object with all fields preserved
 */
export async function getUserByEmail(
  email: string
): Promise<LeanUserDocument | null> {
  try {
    await connectDB();
    return (await UserModel.findOne({
      emailAddress: email,
    }).lean()) as LeanUserDocument | null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

export async function getUserByUsername(
  username: string
): Promise<LeanUserDocument | null> {
  try {
    await connectDB();
    return (await UserModel.findOne({
      username,
    }).lean()) as LeanUserDocument | null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
}

export async function getUserById(
  userId: string
): Promise<LeanUserDocument | null> {
  return (await UserModel.findOne({ _id: userId }, '-password').lean()) as LeanUserDocument | null;
}

/**
 * Creates a new user with activity logging
 */
export async function createUser(
  data: {
    username: string;
    emailAddress: string;
    password: string;
    roles?: string[];
    profile?: Record<string, unknown>;
    isEnabled?: boolean;
    profilePicture?: string | null;
    assignedLocations?: string[];
    assignedLicencees?: string[];
    tempPassword?: string;
    multiplier?: number | null;
  },
  request: NextRequest
) {
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
  } = data;

  // Get current user to check permissions for role assignment
  const requestingUser = await getUserFromServer();

  if (!requestingUser) {
    throw new Error('Authentication required. Please login again.');
  }

  const requestingUserRoles = (requestingUser?.roles || []) as string[];

  if (!Array.isArray(requestingUserRoles) || requestingUserRoles.length === 0) {
    throw new Error('User roles not found. Please contact an administrator.');
  }

  const isOwner = requestingUserRoles.includes('owner');
  const isDeveloper = requestingUserRoles.includes('developer');
  const isAdmin = requestingUserRoles.includes('admin') && !isDeveloper && !isOwner;
  const isManager =
    requestingUserRoles.includes('manager') && !isAdmin && !isDeveloper && !isOwner;

  // Validate role assignments based on creator's permissions
  const ALLOWED_ROLES = [
    'owner',
    'developer',
    'admin',
    'manager',
    'location admin',
    'vault-manager',
    'cashier',
    'technician',
    'collector',
    'reviewer',
  ];
  // Check for invalid roles
  const invalidRoles = roles.filter(r => !ALLOWED_ROLES.includes(r));
  if (invalidRoles.length > 0) {
    throw new Error(
      `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${ALLOWED_ROLES.join(', ')}`
    );
  }

  const isVaultManager =
    requestingUserRoles.includes('vault-manager') &&
    !isAdmin &&
    !isManager &&
    !isDeveloper &&
    !isOwner;

  // Check role assignment permissions
  if (isManager) {
    // Manager can only assign: location admin, technician, collector
    const managerAllowedRoles = ['location admin', 'technician', 'collector'];
    const unauthorizedRoles = roles.filter(
      r => !managerAllowedRoles.includes(r)
    );
    if (unauthorizedRoles.length > 0) {
      throw new Error(
        `Managers can only assign roles: ${managerAllowedRoles.join(', ')}`
      );
    }
  } else if (isVaultManager) {
    // Vault manager can only create cashiers
    const vaultManagerAllowedRoles = ['cashier'];
    const unauthorizedRoles = roles.filter(
      r => !vaultManagerAllowedRoles.includes(r)
    );
    if (unauthorizedRoles.length > 0) {
      throw new Error(`Vault managers can only create cashiers`);
    }
  } else if (isAdmin || isOwner) {
    // Admin and Owner can assign all roles except developer, owner and cashier
    if (roles.some(r => r.trim().toLowerCase() === 'developer')) {
      throw new Error('Only Developers can assign the developer role');
    }
    if (roles.some(r => r.trim().toLowerCase() === 'owner')) {
      throw new Error('Only Developers can assign the owner role');
    }
    if (roles.some(r => r.trim().toLowerCase() === 'cashier')) {
      throw new Error('Only Vault Managers can assign the cashier role');
    }
  } else if (!isDeveloper && !isOwner && !isAdmin && !isManager && !isVaultManager) {
    // Only developer/admin/manager/vault-manager can create users
    console.error('[createUser] Permission check failed:', {
      requestingUserRoles,
      isDeveloper,
      isAdmin,
      isManager,
      isVaultManager,
      userId: requestingUser._id,
    });
    throw new Error(
      'Insufficient permissions to create users. Only owners, developers, admins, managers, and vault managers can create users.'
    );
  }

  // Validate that licencee is provided (user should never be created without a licencee)
  // Use only new field
  const hasLicencees =
    assignedLicencees &&
    Array.isArray(assignedLicencees) &&
    assignedLicencees.length > 0;

  if (!hasLicencees) {
    throw new Error('A user must be assigned to at least one licencee');
  }

  // Check for existing username and email separately to provide specific error messages
  const existingUserByUsername = await UserModel.findOne({ username });
  const existingUserByEmail = await UserModel.findOne({ emailAddress });

  if (existingUserByUsername && existingUserByEmail) {
    throw new Error('Username and email already exist');
  } else if (existingUserByUsername) {
    throw new Error('Username already exists');
  } else if (existingUserByEmail) {
    throw new Error('Email already exists');
  }

  const hashedPassword = await hashPassword(password);

  // Create user - catch MongoDB duplicate key errors
  let newUser;
  try {
    // Use only new fields - no longer writing to old fields (except assignedLocations)
    let finalAssignedLicencees = assignedLicencees || [];
    let finalAssignedLocations = assignedLocations || [];

    // ENFORCEMENT: Managers and Vault Managers can ONLY create users within their own licencees and locations
    // Owners and Developers have NO restrictions (handled by getUserLocationFilter returning 'all')
    if (isManager || isVaultManager) {
      finalAssignedLicencees = (requestingUser.assignedLicencees as string[]) || [];
      finalAssignedLocations = (requestingUser.assignedLocations as string[]) || [];

      console.log(`[createUser] Auto-assigning licencees/locations for new user ${username} based on creator ${requestingUser._id}`);
    }

    // ENFORCEMENT: Vault Managers must have exactly 1 licencee and 1 location
    if (roles.includes('vault-manager')) {
      if (finalAssignedLicencees.length !== 1 || finalAssignedLocations.length !== 1) {
        throw new Error('Vault Managers must be assigned to exactly one licencee and one location');
      }
    }

    // Cashiers with a tempPassword have NOT truly set their own password yet.
    // We leave passwordUpdatedAt as null so the auth system knows they need to change it on first login.
    const isCashier = roles.includes('cashier');
    const hasTemp = !!(tempPassword);

    newUser = await UserModel.create({
      _id: new (
        await import('mongoose')
      ).default.Types.ObjectId().toHexString(),
      username,
      emailAddress,
      password: hashedPassword,
      passwordUpdatedAt: (isCashier && hasTemp) ? null : new Date(),
      roles: roles,
      profile,
      isEnabled,
      profilePicture,
      // Old fields removed - only using assignedLocations and assignedLicencees
      assignedLocations: finalAssignedLocations,
      assignedLicencees: finalAssignedLicencees,
      multiplier: multiplier ?? null,
      tempPasswordChanged: (isCashier && hasTemp) ? false : true, // Cashiers must change on first login
      tempPassword: tempPassword || null, // Store plain text temp password
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
    });
  } catch (dbError: unknown) {
    // Handle MongoDB duplicate key errors (E11000)
    if (
      dbError &&
      typeof dbError === 'object' &&
      'code' in dbError &&
      dbError.code === 11000
    ) {
      const errorMessage =
        dbError instanceof Error ? dbError.message : String(dbError);

      // Parse the error message to determine which field caused the conflict
      if (
        errorMessage.includes('emailAddress') ||
        errorMessage.includes('emailAddress_1')
      ) {
        throw new Error('Email already exists');
      } else if (
        errorMessage.includes('username') ||
        errorMessage.includes('username_1')
      ) {
        throw new Error('Username already exists');
      } else {
        // Generic duplicate key error
        throw new Error('A field with this value already exists');
      }
    }
    // Re-throw if it's not a duplicate key error
    throw dbError;
  }

  const currentUser = await getUserFromServer();
  if (currentUser && currentUser.emailAddress) {
    try {
      const createChanges = [
        { field: 'username', oldValue: null, newValue: username },
        { field: 'emailAddress', oldValue: null, newValue: emailAddress },
        { field: 'roles', oldValue: null, newValue: roles.join(', ') },
        { field: 'isEnabled', oldValue: null, newValue: isEnabled },
        {
          field: 'firstName',
          oldValue: null,
          newValue: profile.firstName || '',
        },
        { field: 'lastName', oldValue: null, newValue: profile.lastName || '' },
        { field: 'gender', oldValue: null, newValue: profile.gender || '' },
        {
          field: 'profilePicture',
          oldValue: null,
          newValue: profilePicture ? 'Profile picture updated' : 'None',
        },
    ];

      await logActivity({
        action: 'CREATE',
        details: `Created new user "${username}" with email ${emailAddress}`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        userId: currentUser._id as string,
        username: currentUser.emailAddress as string,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || 'user',
          resource: 'User',
          resourceId: newUser._id.toString(),
          resourceName: username,
          changes: createChanges,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }
  }

  const userObject = newUser.toObject();
  // Password is intentionally excluded from return value for security
  delete userObject.password;
  return userObject;
}

/**
 * Updates a user's information and logs the activity
 */
export async function updateUser(
  _id: string,
  updateFields: Record<string, unknown>,
  request: NextRequest
) {
  // Find user with password field included (needed for password verification and history)
  const user = await UserModel.findOne({ _id }).select('+password +previousPasswords');
  if (!user) {
    throw new Error('User not found');
  }

  // DEV MODE: Bypass authentication in development
  const isDevMode = process.env.NODE_ENV === 'development';
  let requestingUser = null;
  let requestingUserRoles: string[] = [];
  let isOwner = false;
  let isDeveloper = false;
  let isAdmin = false;
  let isManager = false;
  let isLocationAdmin = false;
  let isVaultManager = false;

  if (!isDevMode) {
    // Get current user to check permissions (early check for manager restrictions)
    requestingUser = await getUserFromServer();
    requestingUserRoles = (requestingUser?.roles || []) as string[];
    isOwner = requestingUserRoles.includes('owner');
    isDeveloper = requestingUserRoles.includes('developer');
    isAdmin = requestingUserRoles.includes('admin') && !isDeveloper && !isOwner;
    isManager =
      requestingUserRoles.includes('manager') && !isAdmin && !isDeveloper && !isOwner;
    isLocationAdmin =
      requestingUserRoles.includes('location admin') &&
      !isAdmin &&
      !isManager &&
      !isDeveloper &&
      !isOwner;
    isVaultManager =
      requestingUserRoles.includes('vault-manager') &&
      !isAdmin &&
      !isManager &&
      !isDeveloper &&
      !isOwner;
  } else {
    // In dev mode, treat as developer to bypass all restrictions
    isDeveloper = true;
  }

  // Location admins cannot edit owners, managers, developers, or admins
  if (isLocationAdmin) {
    const isTargetOwner = user.roles.includes('owner');
    const isTargetDeveloper = user.roles.includes('developer');
    const isTargetAdmin = user.roles.includes('admin');
    const isTargetManager = user.roles.includes('manager');

    if (isTargetOwner || isTargetDeveloper || isTargetAdmin || isTargetManager) {
      throw new Error(
        'Location admins cannot edit owners, developers, admins, or managers'
      );
    }
  }

  // ENFORCEMENT: Only owners, admins and developers can edit assigned locations and licencees
  // This applies to both self-editing and editing others
  const isAssignmentEditingAllowed = isDeveloper || isAdmin || isOwner;

  if (!isAssignmentEditingAllowed) {
    if (updateFields.assignedLocations !== undefined || updateFields.assignedLicencees !== undefined) {
      console.warn(`[updateUser] Unauthorized attempt by user ${requestingUser?._id} to edit assignments for user ${_id}`);

      // Specifically for assignments, we silently remove them if unauthorized
      // to allow other profile updates to proceed
      delete updateFields.assignedLocations;
      delete updateFields.assignedLicencees;

      // Also block legacy fields
      if (updateFields.rel !== undefined) delete updateFields.rel;
      if (updateFields.resourcePermissions !== undefined) delete updateFields.resourcePermissions;
    }
  }

 
  // Validate role assignments if roles are being updated
  if (updateFields.roles !== undefined) {
    const rolesToUpdate = Array.isArray(updateFields.roles) ? (updateFields.roles as string[]) : [];
    
    const ALLOWED_ROLES = [
      'owner',
      'developer',
      'admin',
      'manager',
      'location admin',
      'vault-manager',
      'cashier',
      'technician',
      'collector',
      'reviewer',
    ];

    // Check for invalid roles
    const invalidRoles = rolesToUpdate.filter(
      r => !ALLOWED_ROLES.includes(r)
    );
    if (invalidRoles.length > 0) {
      throw new Error(
        `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${ALLOWED_ROLES.join(', ')}`
      );
    }

    // Check role assignment permissions
      const isOwner = requestingUserRoles.includes('owner');
      if (isManager) {
        // Manager can only assign: location admin, technician, collector
        const managerAllowedRoles = ['location admin', 'technician', 'collector'];
        const unauthorizedRoles = rolesToUpdate.filter(
          r => !managerAllowedRoles.includes(r)
        );
        if (unauthorizedRoles.length > 0) {
          throw new Error(
            `Managers can only assign roles: ${managerAllowedRoles.join(', ')}`
          );
        }
      } else if (isAdmin || isOwner) {
        // Admin and Owner can assign all roles except developer and owner
        if (rolesToUpdate.includes('developer')) {
          throw new Error('Only Developers can assign the developer role');
        }
        if (rolesToUpdate.includes('owner')) {
          throw new Error('Only Developers can assign the owner role');
        }
      } else if (isVaultManager) {
      // Vault manager can only assign 'cashier' role
      const vaultManagerAllowedRoles = ['cashier'];
      const unauthorizedRoles = rolesToUpdate.filter(
        r => !vaultManagerAllowedRoles.includes(r)
      );
      if (unauthorizedRoles.length > 0) {
        throw new Error(`Vault managers can only assign the cashier role`);
      }
    } else if (isAdmin) {
      // Admin cannot assign 'cashier' role
      if (rolesToUpdate.includes('cashier')) {
        throw new Error('Only Vault Managers can assign the cashier role');
      }
    } else if (!isDeveloper && !isAdmin && !isOwner && !isVaultManager) {
      // Only owner/developer/admin/manager/vault-manager can update roles
      throw new Error('Insufficient permissions to update user roles');
    }

    // Normalize roles before saving
    updateFields.roles = rolesToUpdate;

    // ENFORCEMENT: Vault Managers must have exactly 1 licencee and 1 location
    if (rolesToUpdate.includes('vault-manager')) {
      const licencees = (updateFields.assignedLicencees as string[]) || (user.assignedLicencees as string[]) || [];
      const locations = (updateFields.assignedLocations as string[]) || (user.assignedLocations as string[]) || [];

      if (licencees.length !== 1 || locations.length !== 1) {
        throw new Error(
          'Vault Managers must be assigned to exactly one licencee and one location'
        );
      }
    }
  }

  // For managers, ensure they can only toggle isEnabled for users in their licencee
  if (isManager && updateFields.isEnabled !== undefined) {
    // Use only new field for manager
    let managerLicenceeIds: string[] = [];
    if (
      Array.isArray(
        (requestingUser as { assignedLicencees?: string[] })?.assignedLicencees
      )
    ) {
      managerLicenceeIds = (
        requestingUser as { assignedLicencees: string[] }
      ).assignedLicencees.map(id => String(id));
    }

    // Use only new field for user
    let userLicenceeIds: string[] = [];
    if (
      Array.isArray(
        (user as { assignedLicencees?: string[] })?.assignedLicencees
      )
    ) {
      userLicenceeIds = (
        user as { assignedLicencees: string[] }
      ).assignedLicencees.map(id => String(id));
    }

    // Check if user belongs to any of the manager's licencees
    const hasSharedLicencee = userLicenceeIds.some(id =>
      managerLicenceeIds.includes(id)
    );

    if (!hasSharedLicencee) {
      throw new Error(
        'Managers can only enable/disable accounts for users in their licencee'
      );
    }
  }

  // Normalize legacy profile payloads to the latest schema shape
  if (
    updateFields.profile &&
    typeof updateFields.profile === 'object' &&
    updateFields.profile !== null
  ) {
    const profileUpdate = {
      ...(updateFields.profile as Record<string, unknown>),
    };

    const sanitizeNameField = (key: string, label: string): void => {
      const value = profileUpdate[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        // If empty string, remove from update to preserve existing value
        if (!trimmed) {
          delete profileUpdate[key];
          return;
        }
        if (!validateNameField(trimmed)) {
          throw new Error(
            `${label} may only contain letters and spaces and cannot resemble a phone number.`
          );
        }
        profileUpdate[key] = trimmed;
      } else if (value === undefined || value === null) {
        // Remove undefined/null values to preserve existing
        delete profileUpdate[key];
      }
    };

    sanitizeNameField('firstName', 'First name');
    sanitizeNameField('lastName', 'Last name');

    if (typeof profileUpdate.gender === 'string') {
      const genderValue = profileUpdate.gender.trim().toLowerCase();
      // If empty string, remove from update to preserve existing value
      if (!genderValue) {
        delete profileUpdate.gender;
      } else if (!validateOptionalGender(genderValue)) {
        throw new Error('Select a valid gender option.');
      } else {
        profileUpdate.gender = genderValue;
      }
    } else if (
      profileUpdate.gender === undefined ||
      profileUpdate.gender === null
    ) {
      // Remove undefined/null values to preserve existing
      delete profileUpdate.gender;
    }

    const contact =
      typeof profileUpdate.contact === 'object' &&
        profileUpdate.contact !== null
        ? (profileUpdate.contact as Record<string, unknown>)
        : undefined;

    if (profileUpdate.phoneNumber == null) {
      const contactPhone =
        (typeof profileUpdate.phone === 'string'
          ? profileUpdate.phone
          : undefined) ||
        (typeof (profileUpdate as Record<string, unknown>).phoneNumber ===
          'string'
          ? (profileUpdate as Record<string, unknown>).phoneNumber
          : undefined) ||
        (contact?.phone as string | undefined) ||
        (contact?.mobile as string | undefined);

      if (typeof contactPhone === 'string') {
        profileUpdate.phoneNumber = contactPhone;
      }
    }

    delete profileUpdate.contact;
    delete (profileUpdate as Record<string, unknown>).phone;

    if (
      profileUpdate.identification &&
      typeof profileUpdate.identification === 'object'
    ) {
      const identificationUpdate = {
        ...(profileUpdate.identification as Record<string, unknown>),
      };

      if (typeof identificationUpdate.idType === 'string') {
        const trimmed = identificationUpdate.idType.trim();
        // If empty string, remove from update to preserve existing value
        if (!trimmed) {
          delete identificationUpdate.idType;
        } else if (!validateAlphabeticField(trimmed)) {
          throw new Error(
            'Identification type may only contain letters and spaces.'
          );
        } else {
          identificationUpdate.idType = trimmed;
        }
      } else if (
        identificationUpdate.idType === undefined ||
        identificationUpdate.idType === null
      ) {
        // Remove undefined/null values to preserve existing
        delete identificationUpdate.idType;
      }

      // Handle idNumber and notes similarly
      if (typeof identificationUpdate.idNumber === 'string') {
        const trimmed = identificationUpdate.idNumber.trim();
        if (!trimmed) {
          delete identificationUpdate.idNumber;
        } else {
          identificationUpdate.idNumber = trimmed;
        }
      } else if (
        identificationUpdate.idNumber === undefined ||
        identificationUpdate.idNumber === null
      ) {
        delete identificationUpdate.idNumber;
      }

      if (typeof identificationUpdate.notes === 'string') {
        const trimmed = identificationUpdate.notes.trim();
        if (!trimmed) {
          delete identificationUpdate.notes;
        } else {
          identificationUpdate.notes = trimmed;
        }
      } else if (
        identificationUpdate.notes === undefined ||
        identificationUpdate.notes === null
      ) {
        delete identificationUpdate.notes;
      }

      const dobValue = identificationUpdate.dateOfBirth;
      // Only validate dateOfBirth if it's actually provided (not empty/null/undefined)
      // This allows admins to update users without requiring all fields
      if (dobValue !== null && dobValue !== undefined && dobValue !== '') {
        const parsedDate =
          dobValue instanceof Date ? dobValue : new Date(dobValue as string);
        if (!isValidDateInput(parsedDate)) {
          throw new Error('Date of birth must be a valid date.');
        }
        if (parsedDate > new Date()) {
          throw new Error('Date of birth cannot be in the future.');
        }
        identificationUpdate.dateOfBirth = parsedDate;
      } else if (dobValue === '') {
        // If empty string is explicitly provided, remove the field from update
        // This preserves the existing value in the database
        delete identificationUpdate.dateOfBirth;
      } else {
        // If dateOfBirth is not provided (undefined/null), remove it from update
        // This preserves the existing value in the database
        delete identificationUpdate.dateOfBirth;
      }

      profileUpdate.identification = identificationUpdate;
    }

    // Handle address fields - remove empty strings to preserve existing values
    if (
      profileUpdate.address &&
      typeof profileUpdate.address === 'object' &&
      profileUpdate.address !== null
    ) {
      const addressUpdate = profileUpdate.address as Record<string, unknown>;
      const addressFields = [
        'street',
        'town',
        'region',
        'country',
        'postalCode',
      ];

      for (const field of addressFields) {
        const value = addressUpdate[field];
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) {
            delete addressUpdate[field];
          } else {
            addressUpdate[field] = trimmed;
          }
        } else if (value === undefined || value === null) {
          delete addressUpdate[field];
        }
      }

      // If address object is now empty, remove it to preserve existing address
      if (Object.keys(addressUpdate).length === 0) {
        delete profileUpdate.address;
      } else {
        profileUpdate.address = addressUpdate;
      }
    }

    updateFields.profile = profileUpdate;
  }

  if (
    typeof updateFields['profile.contact.phone'] === 'string' &&
    !updateFields['profile.phoneNumber']
  ) {
    updateFields['profile.phoneNumber'] = updateFields['profile.contact.phone'];
  }

  if (updateFields['profile.contact']) {
    delete updateFields['profile.contact'];
  }

  // Validate and hash password if provided
  if (updateFields.password) {
    // Check if password is an object with current and new properties (password change)
    if (
      typeof updateFields.password === 'object' &&
      'current' in updateFields.password &&
      'new' in updateFields.password
    ) {
      const passwordObj = updateFields.password as {
        current: string;
        new: string;
      };

      // Verify current password matches
      const isCurrentPasswordValid = await comparePassword(
        passwordObj.current,
        user.password || ''
      );

      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Ensure new password is not the same as current password
      if (passwordObj.current === passwordObj.new) {
        throw new Error('New password cannot be the same as current password');
      }

      // Check against previous passwords
      if (user.previousPasswords && user.previousPasswords.length > 0) {
        for (const prevHashed of user.previousPasswords) {
          if (await comparePassword(passwordObj.new, prevHashed)) {
            throw new Error('New password cannot match any previously used password');
          }
        }
      }

      // Validate new password strength
      const { validatePasswordStrength } =
        await import('@/lib/utils/validation');
      const passwordValidation = validatePasswordStrength(passwordObj.new);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password requirements not met: ${passwordValidation.feedback.join(
            ', '
          )}`
        );
      }

      // Update password history and current password
      const oldPasswordHash = user.password;
      updateFields.password = await hashPassword(passwordObj.new);
      updateFields.passwordUpdatedAt = new Date();
      updateFields.previousPassword = oldPasswordHash;

      // Update previousPasswords array
      const previousPasswords = [...(user.previousPasswords || [])];
      if (oldPasswordHash) {
        previousPasswords.push(oldPasswordHash);
      }
      // Keep only last 2 passwords in history to prevent re-use
      const uniquePrevious = Array.from(new Set(previousPasswords)).slice(-2);
      updateFields.previousPasswords = uniquePrevious;
    } else if (typeof updateFields.password === 'string') {
      // Legacy support or Admin password reset: if password is a string, validate and hash it
      const { validatePasswordStrength } =
        await import('@/lib/utils/validation');
      const passwordValidation = validatePasswordStrength(
        updateFields.password
      );
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password requirements not met: ${passwordValidation.feedback.join(
            ', '
          )}`
        );
      }

      // Check if resetting to current password
      if (await comparePassword(updateFields.password, user.password || '')) {
        throw new Error('New password cannot be the same as current password');
      }

      // Check against previous passwords
      if (user.previousPasswords && user.previousPasswords.length > 0) {
        for (const prevHashed of user.previousPasswords) {
          if (await comparePassword(updateFields.password, prevHashed)) {
            throw new Error('New password cannot match any previously used password');
          }
        }
      }

      // Hash the password and update history
      const oldPasswordHash = user.password;
      updateFields.password = await hashPassword(updateFields.password);
      updateFields.passwordUpdatedAt = new Date();
      updateFields.previousPassword = oldPasswordHash;

      const previousPasswords = [...(user.previousPasswords || [])];
      if (oldPasswordHash) {
        previousPasswords.push(oldPasswordHash);
      }
      // Keep only last 2 passwords in history to prevent re-use
      const uniquePrevious = Array.from(new Set(previousPasswords)).slice(-2);
      updateFields.previousPasswords = uniquePrevious;
    } else {
      // Invalid password format
      throw new Error(
        'Invalid password format. Expected string or object with current and new properties.'
      );
    }
  }

  // Check for username/email conflicts if they're being updated
  const newUsername = updateFields.username as string | undefined;
  const newEmailAddress = updateFields.emailAddress as string | undefined;
  const currentUsername = user.username;
  const currentEmailAddress = user.emailAddress;

  // Check username conflict if it's being changed
  // Also check for empty string usernames which can cause duplicate key errors
  if (newUsername !== undefined && newUsername !== currentUsername) {
    // Don't allow empty string usernames (they violate unique index)
    if (newUsername === '' || newUsername === null) {
      throw new Error('Username cannot be empty');
    }
    const existingUserByUsername = await UserModel.findOne({
      username: newUsername,
      _id: { $ne: _id }, // Exclude the current user
    });
    if (existingUserByUsername) {
      throw new Error('Username already exists');
    }
  }

  // Check email conflict if it's being changed
  // Also check for empty string emails which can cause duplicate key errors
  if (
    newEmailAddress !== undefined &&
    newEmailAddress !== currentEmailAddress
  ) {
    // Don't allow empty string emails (they violate unique index)
    if (newEmailAddress === '' || newEmailAddress === null) {
      throw new Error('Email address cannot be empty');
    }
    const existingUserByEmail = await UserModel.findOne({
      emailAddress: newEmailAddress,
      _id: { $ne: _id }, // Exclude the current user
    });
    if (existingUserByEmail) {
      throw new Error('Email already exists');
    }
  }

  // No longer syncing to old fields - only using assignedLocations and assignedLicencees

  // Remove rel and resourcePermissions from updateFields if present

  // Remove rel and resourcePermissions from updateFields if present
  if ('rel' in updateFields) {
    delete updateFields.rel;
  }
  if ('resourcePermissions' in updateFields) {
    delete updateFields.resourcePermissions;
  }

  // Separate MongoDB operators from regular fields
  const mongoOperators: Record<string, unknown> = {};
  const regularFields: Record<string, unknown> = {};

  Object.keys(updateFields).forEach(key => {
    if (key.startsWith('$')) {
      // MongoDB operator (like $inc, $push, etc.)
      mongoOperators[key] = updateFields[key];
    } else {
      // Regular field
      regularFields[key] = updateFields[key];
    }
  });

  // Calculate changes for activity log (only from regular fields, not operators)
  const changes = calculateUserChanges(user.toObject(), regularFields);

  // Build the update operation
  const updateOperation: Record<string, unknown> = {};
  if (Object.keys(regularFields).length > 0) {
    updateOperation.$set = regularFields;
  }

  // Add other MongoDB operators (like $inc for sessionVersion)
  Object.keys(mongoOperators).forEach(key => {
    updateOperation[key] = mongoOperators[key];
  });

  // Update user - catch MongoDB duplicate key errors
  let updatedUser;
  try {
    updatedUser = await UserModel.findOneAndUpdate({ _id }, updateOperation, {
      new: true,
    });
  } catch (dbError: unknown) {
    // Handle MongoDB duplicate key errors (E11000)
    if (
      dbError &&
      typeof dbError === 'object' &&
      'code' in dbError &&
      dbError.code === 11000
    ) {
      const errorMessage =
        dbError instanceof Error ? dbError.message : String(dbError);

      // Parse the error message to determine which field caused the conflict
      if (
        errorMessage.includes('emailAddress') ||
        errorMessage.includes('emailAddress_1')
      ) {
        throw new Error('Email already exists');
      } else if (
        errorMessage.includes('username') ||
        errorMessage.includes('username_1')
      ) {
        throw new Error('Username already exists');
      } else {
        // Generic duplicate key error
        throw new Error('A field with this value already exists');
      }
    }
    // Re-throw if it's not a duplicate key error
    throw dbError;
  }

  // Log activity (reuse requestingUser from earlier)
  const currentUser = requestingUser as CurrentUser | null;
  const clientIP = getClientIP(request);
  if (currentUser && currentUser.emailAddress) {
    await logActivity({
      action: 'update',
      details: `Updated user profile for "${updatedUser.username || 'user'}"`,
      ipAddress: clientIP || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      userId: currentUser._id as string,
      username: currentUser.emailAddress as string,
      metadata: {
        userId: currentUser._id,
        userEmail: currentUser.emailAddress,
        userRole: currentUser.roles?.[0] || 'user',
        resource: 'user',
        resourceId: _id,
        resourceName: updatedUser.username || '',
        changes: changes,
      },
    });
  }

  return updatedUser;
}

/**
 * Deletes a user with activity logging (soft delete)
 */
export async function deleteUser(_id: string, request: NextRequest) {
  // Get the user to be deleted first to check their roles
  const userToDelete = await UserModel.findOne({ _id });
  if (!userToDelete) {
    throw new Error('User not found');
  }

  // Check if current user is a location admin and prevent deletion of managers/developers/admins
  const currentUser = await getUserFromServer();
  if (currentUser) {
    const currentUserRoles = (currentUser.roles || []) as string[];
    const isLocationAdmin =
      currentUserRoles.includes('location admin') &&
      !currentUserRoles.includes('owner') &&
      !currentUserRoles.includes('developer') &&
      !currentUserRoles.includes('admin') &&
      !currentUserRoles.includes('manager');

    if (isLocationAdmin) {
      const targetUserRoles = (userToDelete.roles || []) as string[];
      const normalizedTargetRoles = targetUserRoles.map(r =>
        String(r).trim().toLowerCase()
      );
      const isTargetOwner = normalizedTargetRoles.includes('owner');
      const isTargetDeveloper = normalizedTargetRoles.includes('developer');
      const isTargetAdmin = normalizedTargetRoles.includes('admin');
      const isTargetManager = normalizedTargetRoles.includes('manager');

      if (isTargetOwner || isTargetDeveloper || isTargetAdmin || isTargetManager) {
        throw new Error(
          'Location admins cannot delete owners, developers, admins, or managers'
        );
      }
    }
  }

  const deletedUser = await UserModel.findOneAndUpdate(
    { _id },
    {
      deletedAt: new Date(),
      updatedAt: new Date(),
    },
    { new: true }
  );
  if (!deletedUser) {
    throw new Error('User not found');
  }
  if (currentUser && currentUser.emailAddress) {
    try {
      const deleteChanges = [
        { field: 'username', oldValue: deletedUser.username, newValue: null },
        {
          field: 'emailAddress',
          oldValue: deletedUser.emailAddress,
          newValue: null,
        },
        {
          field: 'roles',
          oldValue: deletedUser.roles?.join(', ') || '',
          newValue: null,
        },
        { field: 'isEnabled', oldValue: deletedUser.isEnabled, newValue: null },
        {
          field: 'firstName',
          oldValue: deletedUser.profile?.firstName || '',
          newValue: null,
        },
        {
          field: 'lastName',
          oldValue: deletedUser.profile?.lastName || '',
          newValue: null,
        },
        {
          field: 'gender',
          oldValue: deletedUser.profile?.gender || '',
          newValue: null,
        },
        {
          field: 'profilePicture',
          oldValue: deletedUser.profilePicture || 'None',
          newValue: null,
        },
      ];

      await logActivity({
        action: 'DELETE',
        details: `Deleted user "${deletedUser.username || deletedUser.emailAddress
          }"`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        userId: currentUser._id as string,
        username: currentUser.emailAddress as string,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || 'user',
          resource: 'User',
          resourceId: _id,
          resourceName: deletedUser.username || deletedUser.emailAddress,
          changes: deleteChanges,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }
  }

  return deletedUser;
}

/**
 * Calculates changes between original user and update fields
 */
function calculateUserChanges(
  originalUser: OriginalUserType,
  updateFields: Record<string, unknown>
) {
  const changes: Array<{ field: string; oldValue: string; newValue: string }> =
    [];

  const extractProfileUpdate = () => {
    if (
      updateFields.profile &&
      typeof updateFields.profile === 'object' &&
      updateFields.profile !== null
    ) {
      return updateFields.profile as Record<string, unknown>;
    }

    const profileKeys = Object.keys(updateFields).filter(key =>
      key.startsWith('profile.')
    );
    if (profileKeys.length === 0) {
      return null;
    }

    const extracted: Record<string, unknown> = {};
    profileKeys.forEach(key => {
      const path = key.replace(/^profile\./, '');
      const segments = path.split('.');
      let current: Record<string, unknown> = extracted;
      segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
          current[segment] = updateFields[key];
          return;
        }

        if (
          !current[segment] ||
          typeof current[segment] !== 'object' ||
          current[segment] === null
        ) {
          current[segment] = {};
        }
        current = current[segment] as Record<string, unknown>;
      });
    });

    return extracted;
  };

  const profileUpdate = extractProfileUpdate();

  const getUpdatedValue = (fieldPath: string) => {
    if (fieldPath in updateFields) {
      return updateFields[fieldPath];
    }
    const dottedKey = `profile.${fieldPath}`;
    if (dottedKey in updateFields) {
      return updateFields[dottedKey];
    }

    if (!profileUpdate) {
      return undefined;
    }

    const segments = fieldPath.split('.');
    let current: unknown = profileUpdate;
    for (const segment of segments) {
      if (
        !current ||
        typeof current !== 'object' ||
        !(segment in (current as Record<string, unknown>))
      ) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  };

  const fieldChecks = [
    {
      field: 'firstName',
      original: originalUser.profile?.firstName,
      updated: getUpdatedValue('firstName'),
    },
    {
      field: 'lastName',
      original: originalUser.profile?.lastName,
      updated: getUpdatedValue('lastName'),
    },
    {
      field: 'gender',
      original: originalUser.profile?.gender,
      updated: getUpdatedValue('gender'),
    },
    {
      field: 'phoneNumber',
      original: (originalUser.profile as { phoneNumber?: string } | undefined)
        ?.phoneNumber,
      updated: getUpdatedValue('phoneNumber'),
    },
    {
      field: 'address.street',
      original: originalUser.profile?.address?.street,
      updated: getUpdatedValue('address.street'),
    },
    {
      field: 'address.town',
      original: originalUser.profile?.address?.town,
      updated: getUpdatedValue('address.town'),
    },
    {
      field: 'address.region',
      original: originalUser.profile?.address?.region,
      updated: getUpdatedValue('address.region'),
    },
    {
      field: 'address.country',
      original: originalUser.profile?.address?.country,
      updated: getUpdatedValue('address.country'),
    },
    {
      field: 'address.postalCode',
      original: originalUser.profile?.address?.postalCode,
      updated: getUpdatedValue('address.postalCode'),
    },
    {
      field: 'identification.dateOfBirth',
      original: originalUser.profile?.identification?.dateOfBirth,
      updated: getUpdatedValue('identification.dateOfBirth'),
    },
    {
      field: 'identification.idType',
      original: originalUser.profile?.identification?.idType,
      updated: getUpdatedValue('identification.idType'),
    },
    {
      field: 'identification.idNumber',
      original: originalUser.profile?.identification?.idNumber,
      updated: getUpdatedValue('identification.idNumber'),
    },
    {
      field: 'identification.notes',
      original: originalUser.profile?.identification?.notes,
      updated: getUpdatedValue('identification.notes'),
    },
    {
      field: 'notes',
      original: (originalUser.profile as { notes?: string } | undefined)?.notes,
      updated: getUpdatedValue('notes'),
    },
    {
      field: 'username',
      original: originalUser.username,
      updated: updateFields.username,
    },
    {
      field: 'emailAddress',
      original: originalUser.emailAddress,
      updated: updateFields.emailAddress,
    },
    {
      field: 'profilePicture',
      original: originalUser.profilePicture,
      updated: updateFields.profilePicture,
    },
    {
      field: 'multiplier',
      original: originalUser.multiplier,
      updated: updateFields.multiplier,
    },
  ];

  fieldChecks.forEach(({ field, original, updated }) => {
    if (updated !== undefined && updated !== original) {
      let oldValue = (original as string) || '';
      let newValue = (updated as string) || '';

      // Mask profile picture content
      if (field === 'profilePicture') {
        oldValue = original ? 'Profile picture updated' : 'None';
        newValue = updated ? 'Profile picture updated' : 'None';
      }

      changes.push({
        field,
        oldValue,
        newValue,
      });
    }
  });

  return changes;
}

// ============================================================================
// User List Helpers - Extracted from route.ts for better organization
// ============================================================================

/**
 * Handle request for deleted users
 *
 * @param currentUser - Current user object
 * @param currentUserRoles - Current user roles array
 * @param currentUserLicencees - Current user assigned licencees
 * @param currentUserLocationPermissions - Current user assigned locations
 * @param searchParams - URL search parameters
 * @param startTime - Request start time for performance tracking
 * @param context - API logger context
 * @returns Promise<Response> - Formatted API response with deleted users
 */
type UserItem = Record<string, unknown> & {
  _id: string | unknown;
  username?: string;
  email?: string;
  emailAddress?: string;
  isEnabled?: boolean;
  enabled?: boolean;
  assignedLocations?: string[];
  assignedLicencees?: string[];
  profile?: Record<string, unknown>;
  roles?: string[];
  discrepancy?: number;
};

export async function handleDeletedUsersRequest(
  currentUser: Record<string, unknown> | null,
  currentUserRoles: string[],
  currentUserLicencees: string[],
  currentUserLocationPermissions: string[],
  searchParams: URLSearchParams,
  startTime: number,
  context: LogContext
): Promise<NextResponse> {
  const search = searchParams.get('search');
  const searchMode = searchParams.get('searchMode') || 'username';
  const licencee = searchParams.get('licencee');

  // Fetch deleted users
  const users = await getDeletedUsers();

  let result: UserItem[] = users.map(user => ({
    _id: user._id,
    name: `${user.profile && typeof user.profile === 'object' ? (user.profile as Record<string, unknown>).firstName ?? '' : ''} ${user.profile && typeof user.profile === 'object' ? (user.profile as Record<string, unknown>).lastName ?? '' : ''}`.trim(),
    username: user.username,
    email: user.emailAddress,
    isEnabled: user.isEnabled,
    roles: user.roles as string[],
    profilePicture: (user.profilePicture as string) ?? null,
    profile: user.profile as Record<string, unknown>,
    assignedLocations: (user.assignedLocations as string[]) || undefined,
    assignedLicencees: (user.assignedLicencees as string[]) || undefined,
    loginCount: user.loginCount,
    lastLoginAt: user.lastLoginAt,
    sessionVersion: user.sessionVersion,
  }));

  // Apply filters
  result = applyRoleBasedFiltering(
    result,
    currentUser,
    currentUserRoles,
    currentUserLicencees,
    currentUserLocationPermissions
  );

  if (licencee && licencee !== 'all') {
    result = result.filter(user => {
      const userLicencees = Array.isArray(user.assignedLicencees)
        ? user.assignedLicencees
        : [];
      return userLicencees.includes(licencee);
    });
  }

  if (search && search.trim()) {
    result = applySearchFilter(result, search, searchMode);
  }

  return paginateAndRespond(result, searchParams, startTime, context);
}

/**
 * Handle request for cashiers only
 *
 * @param currentUser - Current user object
 * @param currentUserRoles - Current user roles array
 * @param currentUserLicencees - Current user assigned licencees
 * @param currentUserLocationPermissions - Current user assigned locations
 * @param searchParams - URL search parameters
 * @param startTime - Request start time for performance tracking
 * @param context - API logger context
 * @returns Promise<Response> - Formatted API response with cashiers
 */
export async function handleCashiersRequest(
  currentUser: Record<string, unknown> | null,
  currentUserRoles: string[],
  currentUserLicencees: string[],
  currentUserLocationPermissions: string[],
  searchParams: URLSearchParams,
  startTime: number,
  context: LogContext
): Promise<NextResponse> {
  const search = searchParams.get('search');
  const searchMode = searchParams.get('searchMode') || 'username';
  const licencee = searchParams.get('licencee');

  // STEP 1: Connect to database to ensure we can fetch shifts
  await connectDB();

  // Fetch all users and filter for cashiers
  const [users, allActiveShifts] = await Promise.all([
    getAllUsers(),
    CashierShiftModel.find({
      status: { $in: ['active', 'pending_review', 'pending_start'] }
    }).lean()
  ]);

  // Create a map of active shift data by cashier ID
  const shiftMap = new Map<string, { status: string; balance: number; denominations: unknown[]; discrepancy: number }>();
  allActiveShifts.forEach((shift: Record<string, unknown>) => {
    shiftMap.set(String(shift.cashierId), {
      status: String(shift.status),
      balance: (shift.status === 'active' || shift.status === 'pending_review')
        ? ((shift.currentBalance as number) || (shift.openingBalance as number) || 0)
        : ((shift.openingBalance as number) || 0),
      denominations: (shift.lastSyncedDenominations as unknown[]) ?? (shift.openingDenominations as unknown[]) ?? [],
      discrepancy: (shift.discrepancy as number) || 0
    });
  });

  let result: UserItem[] = users
    .filter((user: Record<string, unknown>) => {
      const userRoles = Array.isArray(user.roles) ? user.roles : [];
      return userRoles.some(
        (userRole: unknown) =>
          typeof userRole === 'string' && userRole.toLowerCase() === 'cashier'
      );
    })
    .map((user: Record<string, unknown>) => ({
      _id: user._id,
      name: `${user.profile && typeof user.profile === 'object' ? (user.profile as Record<string, unknown>).firstName ?? '' : ''} ${user.profile && typeof user.profile === 'object' ? (user.profile as Record<string, unknown>).lastName ?? '' : ''}`.trim(),
      username: user.username as string,
      emailAddress: user.emailAddress as string,
      isEnabled: user.isEnabled as boolean,
      shiftStatus: (shiftMap.get(String(user._id))?.status || 'inactive') as 'active' | 'pending_review' | 'pending_start' | 'closed' | 'inactive',
      currentBalance: shiftMap.get(String(user._id))?.balance || 0,
      denominations: shiftMap.get(String(user._id))?.denominations || [],
      discrepancy: shiftMap.get(String(user._id))?.discrepancy || 0,
      roles: user.roles as string[],
      profilePicture: (user.profilePicture as string) ?? null,
      profile: user.profile as Record<string, unknown>,
      assignedLocations: (user.assignedLocations as string[]) || undefined,
      assignedLicencees: (user.assignedLicencees as string[]) || undefined,
      loginCount: user.loginCount as number,
      lastLoginAt: user.lastLoginAt as Date,
      sessionVersion: user.sessionVersion as number,
      tempPassword: user.tempPassword as string,
      tempPasswordChanged: user.tempPasswordChanged as boolean,
    }));

  // Apply role-based filtering
  result = applyRoleBasedFiltering(
    result,
    currentUser,
    currentUserRoles,
    currentUserLicencees,
    currentUserLocationPermissions
  );

  if (licencee && licencee !== 'all') {
    result = result.filter((user: Record<string, unknown>) => {
      const userLicencees = Array.isArray(user.assignedLicencees)
        ? user.assignedLicencees
        : [];
      return userLicencees.includes(licencee);
    });
  }

  if (search && search.trim()) {
    result = applySearchFilter(result, search, searchMode);
  }

  const varianceFilter = searchParams.get('variance');
  if (varianceFilter === 'variance') {
    result = result.filter(u => Math.abs(u.discrepancy || 0) > 0.01);
  } else if (varianceFilter === 'no-variance') {
    result = result.filter(u => Math.abs(u.discrepancy || 0) <= 0.01);
  }

  return paginateAndRespond(result, searchParams, startTime, context);
}

/**
 * Handle request for all users (default case)
 *
 * @param currentUser - Current user object
 * @param currentUserRoles - Current user roles array
 * @param currentUserLicencees - Current user assigned licencees
 * @param currentUserLocationPermissions - Current user assigned locations
 * @param searchParams - URL search parameters
 * @param startTime - Request start time for performance tracking
 * @param context - API logger context
 * @returns Promise<Response> - Formatted API response with all users
 */
export async function handleAllUsersRequest(
  currentUser: Record<string, unknown> | null,
  currentUserRoles: string[],
  currentUserLicencees: string[],
  currentUserLocationPermissions: string[],
  searchParams: URLSearchParams,
  startTime: number,
  context: LogContext
): Promise<NextResponse> {
  const search = searchParams.get('search');
  const searchMode = searchParams.get('searchMode') || 'username';
  const status = searchParams.get('status') || 'all';
  const role = searchParams.get('role');
  const licencee = searchParams.get('licencee');

  // Fetch all users
  const users = await getAllUsers();

  let result: UserItem[] = users.map((user: Record<string, unknown>) => ({
    _id: user._id,
    name: `${user.profile && typeof user.profile === 'object' ? (user.profile as Record<string, unknown>).firstName ?? '' : ''} ${user.profile && typeof user.profile === 'object' ? (user.profile as Record<string, unknown>).lastName ?? '' : ''}`.trim(),
    username: user.username as string,
    emailAddress: user.emailAddress as string,
    isEnabled: user.isEnabled as boolean,
    roles: user.roles as string[],
    profilePicture: (user.profilePicture as string) ?? null,
    profile: user.profile as Record<string, unknown>,
    assignedLocations: (user.assignedLocations as string[]) || undefined,
    assignedLicencees: (user.assignedLicencees as string[]) || undefined,
    loginCount: user.loginCount as number,
    lastLoginAt: user.lastLoginAt as Date,
    sessionVersion: user.sessionVersion as number,
    tempPassword: user.tempPassword as string,
    tempPasswordChanged: user.tempPasswordChanged as boolean,
  }));

  // Apply role-based filtering
  result = applyRoleBasedFiltering(
    result,
    currentUser,
    currentUserRoles,
    currentUserLicencees,
    currentUserLocationPermissions
  );

  // Apply status filtering
  if (status !== 'all') {
    if (status === 'active') {
      result = result.filter((user: Record<string, unknown>) => user.isEnabled === true);
    } else if (status === 'disabled') {
      result = result.filter((user: Record<string, unknown>) => user.isEnabled === false);
    }
  }

  // Apply role filtering
  if (role && role !== 'all') {
    result = result.filter((user: Record<string, unknown>) => {
      const userRoles = Array.isArray(user.roles) ? user.roles : [];
      return userRoles.some(
        (userRole: unknown) =>
          typeof userRole === 'string' &&
          userRole.toLowerCase() === role.toLowerCase()
      );
    });
  }

  // Apply licencee filtering
  if (licencee && licencee !== 'all') {
    result = result.filter((user: UserItem) => {
      const userLicencees = Array.isArray(user.assignedLicencees)
        ? user.assignedLicencees
        : [];
      return userLicencees.includes(licencee);
    });
  }

  // Apply search filtering
  if (search && search.trim()) {
    result = applySearchFilter(result, search, searchMode);
  }

  return paginateAndRespond(result, searchParams, startTime, context);
}

/**
 * Apply role-based filtering based on current user permissions
 *
 * @param users - Array of users to filter
 * @param currentUser - Current user object
 * @param currentUserRoles - Current user roles array
 * @param currentUserLicencees - Current user assigned licencees
 * @param currentUserLocationPermissions - Current user assigned locations
 * @returns Filtered array of users based on role-based access control
 */
function applyRoleBasedFiltering(
  users: UserItem[],
  currentUser: Record<string, unknown> | null,
  currentUserRoles: string[],
  currentUserLicencees: string[],
  currentUserLocationPermissions: string[]
): UserItem[] {
  const isAdmin =
    currentUserRoles.includes('admin') ||
    currentUserRoles.includes('developer') ||
    currentUserRoles.includes('owner');
  const isManager = currentUserRoles.includes('manager') && !isAdmin;
  const isLocationAdmin =
    currentUserRoles.includes('location admin') && !isAdmin && !isManager;

  let result = [...users];

  if (isManager && !isAdmin) {
    // Managers can only see users with same licencees
    // Managers can only see users with same licencees OR same locations
    result = result.filter(user => {
      const userLicencees = (user.assignedLicencees || []).map(l => String(l));
      const hasSharedLicencee = userLicencees.some((userLic: string) =>
        currentUserLicencees.includes(userLic)
      );

      if (hasSharedLicencee) return true;

      const userLocs = (user.assignedLocations || []).map(l => String(l));
      if (userLocs.includes('all')) return true;

      return userLocs.some(loc => currentUserLocationPermissions.includes(loc));
    });
  } else if (isLocationAdmin) {
    // Location admins can only see users who have access to at least one of their assigned locations
    const currentUserId = currentUser?._id ? String(currentUser._id) : null;

    if (currentUserLocationPermissions.length === 0) {
      result = [];
    } else {
      const normalizedCurrentLocs = currentUserLocationPermissions.map(loc =>
        String(loc).trim()
      );

      result = result.filter(user => {
        const userId = String(user._id || '');
        const isCurrentUser = currentUserId && userId === currentUserId;

        if (isCurrentUser) {
          return true;
        }

        let userLocationPermissionsRaw: unknown[] = [];
        if (
          Array.isArray(user.assignedLocations) &&
          user.assignedLocations.length > 0
        ) {
          userLocationPermissionsRaw = user.assignedLocations;
        }

        const userLocationPermissions = userLocationPermissionsRaw
          .map(id => String(id).trim())
          .filter(id => id.length > 0);

        if (userLocationPermissions.length === 0) {
          return false;
        }

        return userLocationPermissions.some(userLoc =>
          normalizedCurrentLocs.includes(userLoc)
        );
      });
    }
  }

  // Filter out current user from results
  const currentUserId = currentUser?._id ? String(currentUser._id) : null;
  if (currentUserId) {
    result = result.filter(user => {
      const userId = String(user._id || '');
      return userId !== currentUserId;
    });
  }

  return result;
}

/**
 * Apply search filtering to user results
 *
 * @param users - Array of users to filter
 * @param search - Search term
 * @param searchMode - Search mode ('username', 'email', '_id', 'all')
 * @returns Filtered array of users matching search criteria
 */
function applySearchFilter(
  users: UserItem[],
  search: string,
  searchMode: string
): UserItem[] {
  const lowerSearchValue = search.toLowerCase().trim();

  // First filter the users
  const filteredUsers = users.filter(user => {
    if (searchMode === 'all') {
      const username = (user.username || '').toLowerCase();
      const email = (user.email || user.emailAddress || '').toLowerCase();
      const userId = String(user._id || '').toLowerCase();
      return (
        username.includes(lowerSearchValue) ||
        email.includes(lowerSearchValue) ||
        userId.includes(lowerSearchValue)
      );
    } else if (searchMode === 'username') {
      const username = user.username || '';
      return username.toLowerCase().includes(lowerSearchValue);
    } else if (searchMode === 'email') {
      const email = user.email || user.emailAddress || '';
      return email.toLowerCase().includes(lowerSearchValue);
    } else if (searchMode === '_id') {
      const userId = String(user._id || '').toLowerCase();
      return userId.includes(lowerSearchValue);
    }
    return false;
  });

  // Then sort by relevance
  return filteredUsers.sort((a, b) => {
    const getRelevance = (user: UserItem) => {
      let score = 0;
      const username = (user.username || '').toLowerCase();
      const email = (user.email || user.emailAddress || '').toLowerCase();
      const userId = String(user._id || '').toLowerCase();

      if (username.startsWith(lowerSearchValue)) score += 20;
      if (email.startsWith(lowerSearchValue)) score += 10;
      if (userId.startsWith(lowerSearchValue)) score += 5;

      return score;
    };

    return getRelevance(b) - getRelevance(a);
  });
}

/**
 * Apply pagination and return formatted response
 *
 * @param users - Array of users to paginate
 * @param searchParams - URL search parameters for pagination
 * @param startTime - Request start time for performance tracking
 * @param context - API logger context
 * @returns Formatted Response object with paginated data
 */
function paginateAndRespond(
  users: UserItem[],
  searchParams: URLSearchParams,
  startTime: number,
  context: LogContext
): NextResponse {

  const page = parseInt(searchParams.get('page') || '1');
  const requestedLimit = parseInt(searchParams.get('limit') || '50');
  const limit = Math.min(requestedLimit, 1000);
  const skip = (page - 1) * limit;

  const totalCount = users.length;
  const paginatedUsers = users.slice(skip, skip + limit);

  const duration = Date.now() - startTime;
  if (duration > 2000) {
    console.warn(`[Users API] GET completed in ${duration}ms`);
  }

  apiLogger.logSuccess(
    context,
    `Successfully fetched ${totalCount} users (returning ${paginatedUsers.length} on page ${page})`
  );

  return NextResponse.json(
    {
      success: true,
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    },
    {
      status: 200,
    }
  );
}

