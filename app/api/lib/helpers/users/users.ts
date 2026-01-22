import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { comparePassword, hashPassword } from '@/app/api/lib/utils/validation';
import { getCurrentDbConnectionString, getJwtSecret } from '@/lib/utils/auth';
import { getClientIP } from '@/lib/utils/ipAddress';
import {
    isValidDateInput,
    validateAlphabeticField,
    validateNameField,
    validateOptionalGender,
} from '@/lib/utils/validation';
import type { LeanUserDocument } from '@/shared/types/auth';
import type {
    CurrentUser,
    OriginalUserType,
} from '@/shared/types/users';
import { JWTPayload, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
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
      assignedLicensees?: string[];
    };

    let dbUser: {
      sessionVersion?: number;
      roles?: string[];
      permissions?: string[];
      assignedLocations?: string[];
      assignedLicensees?: string[];
      isEnabled?: boolean;
      deletedAt?: Date | null;
    } | null = null;

    if (jwtPayload._id) {
      try {
        await connectDB();
        const UserModel = (await import('@/app/api/lib/models/user')).default;
        dbUser = (await UserModel.findOne({ _id: jwtPayload._id })
          .select(
            'sessionVersion roles permissions assignedLocations assignedLicensees isEnabled deletedAt'
          )
          .lean()) as {
          sessionVersion?: number;
          roles?: string[];
          permissions?: string[];
          assignedLocations?: string[];
          assignedLicensees?: string[];
          isEnabled?: boolean;
          deletedAt?: Date | null;
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

      // Hydrate assignedLocations and assignedLicensees from database
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
      if (Array.isArray(dbUser.assignedLicensees)) {
        // Database has data (even if empty) - ALWAYS use it (database is source of truth)
        const dbLicensees = dbUser.assignedLicensees.map((id: string) =>
          String(id)
        );
        jwtPayload.assignedLicensees = dbLicensees;
      } else if (Array.isArray(jwtPayload.assignedLicensees)) {
        // JWT has data but DB doesn't - keep JWT data
        // (This shouldn't happen after migration, but handle gracefully)
      } else {
        // No data in JWT or DB - ensure empty array is set
        jwtPayload.assignedLicensees = [];
      }
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
  ).lean(); // Use lean() to get plain JavaScript objects instead of Mongoose documents
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
export async function getUserByEmail(email: string): Promise<LeanUserDocument | null> {
  try {
    await connectDB();
    return await UserModel.findOne({ emailAddress: email }).lean() as LeanUserDocument | null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

export async function getUserByUsername(username: string): Promise<LeanUserDocument | null> {
  try {
    await connectDB();
    return await UserModel.findOne({ username }).lean() as LeanUserDocument | null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
}

export async function getUserById(userId: string) {
  return await UserModel.findOne({ _id: userId }, '-password').lean();
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
    assignedLicensees?: string[];
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
    assignedLicensees,
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

  const isDeveloper = requestingUserRoles.includes('developer');
  const isAdmin = requestingUserRoles.includes('admin') && !isDeveloper;
  const isManager =
    requestingUserRoles.includes('manager') && !isAdmin && !isDeveloper;

  // Validate role assignments based on creator's permissions
  const ALLOWED_ROLES = [
    'developer',
    'admin',
    'manager',
    'location admin',
    'vault-manager',
    'cashier',
    'technician',
    'collector',
  ];
  const normalizedRoles = roles.map(r => r.trim().toLowerCase());

  // Check for invalid roles
  const invalidRoles = normalizedRoles.filter(r => !ALLOWED_ROLES.includes(r));
  if (invalidRoles.length > 0) {
    throw new Error(
      `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${ALLOWED_ROLES.join(', ')}`
    );
  }

  // Check role assignment permissions
  if (isManager) {
    // Manager can only assign: location admin, technician, collector
    const managerAllowedRoles = ['location admin', 'technician', 'collector'];
    const unauthorizedRoles = normalizedRoles.filter(
      r => !managerAllowedRoles.includes(r)
    );
    if (unauthorizedRoles.length > 0) {
      throw new Error(
        `Managers can only assign roles: ${managerAllowedRoles.join(', ')}`
      );
    }
  } else if (isAdmin) {
    // Admin can assign all roles except developer
    if (normalizedRoles.includes('developer')) {
      throw new Error('Admins cannot assign the developer role');
    }
  } else if (!isDeveloper && !isAdmin && !isManager) {
    // Only developer/admin/manager can create users
    console.error('[createUser] Permission check failed:', {
      requestingUserRoles,
      isDeveloper,
      isAdmin,
      isManager,
      userId: requestingUser._id,
    });
    throw new Error(
      'Insufficient permissions to create users. Only developers, admins, and managers can create users.'
    );
  }

  // Validate that licensee is provided (user should never be created without a licensee)
  // Use only new field
  const hasLicensees =
    assignedLicensees &&
    Array.isArray(assignedLicensees) &&
    assignedLicensees.length > 0;

  if (!hasLicensees) {
    throw new Error('A user must be assigned to at least one licensee');
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
    // Use only new fields - no longer writing to old fields
    const finalAssignedLicensees = assignedLicensees || [];
    const finalAssignedLocations = assignedLocations || [];

    newUser = await UserModel.create({
      _id: new (
        await import('mongoose')
      ).default.Types.ObjectId().toHexString(),
      username,
      emailAddress,
      password: hashedPassword,
      passwordUpdatedAt: new Date(),
      roles: normalizedRoles,
      profile,
      isEnabled,
      profilePicture,
      // Old fields removed - only using assignedLocations and assignedLicensees
      assignedLocations: finalAssignedLocations,
      assignedLicensees: finalAssignedLicensees,
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
          newValue: profilePicture || 'None',
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
  // Find user with password field included (needed for password verification)
  const user = await UserModel.findOne({ _id }).select('+password');
  if (!user) {
    throw new Error('User not found');
  }

  // DEV MODE: Bypass authentication in development
  const isDevMode = process.env.NODE_ENV === 'development';
  let requestingUser = null;
  let requestingUserRoles: string[] = [];
  let isDeveloper = false;
  let isAdmin = false;
  let isManager = false;
  let isLocationAdmin = false;

  if (!isDevMode) {
    // Get current user to check permissions (early check for manager restrictions)
    requestingUser = await getUserFromServer();
    requestingUserRoles = (requestingUser?.roles || []) as string[];
    isDeveloper = requestingUserRoles.includes('developer');
    isAdmin = requestingUserRoles.includes('admin') && !isDeveloper;
    isManager =
      requestingUserRoles.includes('manager') && !isAdmin && !isDeveloper;
    isLocationAdmin =
      requestingUserRoles.includes('location admin') &&
      !isAdmin &&
      !isManager &&
      !isDeveloper;
  } else {
    // In dev mode, treat as developer to bypass all restrictions
    isDeveloper = true;
  }

  // Location admins cannot edit managers, developers, or admins
  if (isLocationAdmin) {
    const targetUserRoles = (user.roles || []) as string[];
    const normalizedTargetRoles = targetUserRoles.map(r =>
      String(r).trim().toLowerCase()
    );
    const isTargetDeveloper = normalizedTargetRoles.includes('developer');
    const isTargetAdmin = normalizedTargetRoles.includes('admin');
    const isTargetManager = normalizedTargetRoles.includes('manager');

    if (isTargetDeveloper || isTargetAdmin || isTargetManager) {
      throw new Error(
        'Location admins cannot edit developers, admins, or managers'
      );
    }
  }

  // Validate role assignments if roles are being updated
  if (updateFields.roles !== undefined) {
    const ALLOWED_ROLES = [
      'developer',
      'admin',
      'manager',
      'location admin',
      'vault-manager',
      'cashier',
      'technician',
      'collector',
    ];
    const newRoles = Array.isArray(updateFields.roles)
      ? updateFields.roles
      : [];
    const normalizedRoles = newRoles.map(r => String(r).trim().toLowerCase());

    // Check for invalid roles
    const invalidRoles = normalizedRoles.filter(
      r => !ALLOWED_ROLES.includes(r)
    );
    if (invalidRoles.length > 0) {
      throw new Error(
        `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${ALLOWED_ROLES.join(', ')}`
      );
    }

    // Check role assignment permissions
    if (isManager) {
      // Manager can only assign: location admin, technician, collector
      const managerAllowedRoles = ['location admin', 'technician', 'collector'];
      const unauthorizedRoles = normalizedRoles.filter(
        r => !managerAllowedRoles.includes(r)
      );
      if (unauthorizedRoles.length > 0) {
        throw new Error(
          `Managers can only assign roles: ${managerAllowedRoles.join(', ')}`
        );
      }
    } else if (isAdmin) {
      // Admin can assign all roles except developer
      if (normalizedRoles.includes('developer')) {
        throw new Error('Admins cannot assign the developer role');
      }
    } else if (!isDeveloper) {
      // Only developer/admin/manager can update roles
      throw new Error('Insufficient permissions to update user roles');
    }

    // Normalize roles before saving
    updateFields.roles = normalizedRoles;
  }

  // Prevent managers from changing licensee assignments
  if (isManager) {
    // Check new field
    if (updateFields.assignedLicensees !== undefined) {
      // Get original licensee assignments (use only new field)
      let originalLicensees: string[] = [];
      if (
        Array.isArray(
          (user as { assignedLicensees?: string[] })?.assignedLicensees
        )
      ) {
        originalLicensees = (user as { assignedLicensees: string[] })
          .assignedLicensees;
      }
      const newLicensees = Array.isArray(updateFields.assignedLicensees)
        ? (updateFields.assignedLicensees as string[]).map(id => String(id))
        : [];

      // Check if licensee assignments changed
      const originalNormalized = originalLicensees.map(id => String(id)).sort();
      const newNormalized = newLicensees.sort();
      const licenseeChanged =
        originalNormalized.length !== newNormalized.length ||
        !originalNormalized.every((id, idx) => id === newNormalized[idx]);

      if (licenseeChanged) {
        throw new Error('Managers cannot change licensee assignments');
      }
    }
  }

  // For managers, ensure they can only toggle isEnabled for users in their licensee
  if (isManager && updateFields.isEnabled !== undefined) {
    // Use only new field for manager
    let managerLicenseeIds: string[] = [];
    if (
      Array.isArray(
        (requestingUser as { assignedLicensees?: string[] })?.assignedLicensees
      )
    ) {
      managerLicenseeIds = (
        requestingUser as { assignedLicensees: string[] }
      ).assignedLicensees.map(id => String(id));
    }

    // Use only new field for user
    let userLicenseeIds: string[] = [];
    if (
      Array.isArray(
        (user as { assignedLicensees?: string[] })?.assignedLicensees
      )
    ) {
      userLicenseeIds = (
        user as { assignedLicensees: string[] }
      ).assignedLicensees.map(id => String(id));
    }

    // Check if user belongs to any of the manager's licensees
    const hasSharedLicensee = userLicenseeIds.some(id =>
      managerLicenseeIds.includes(id)
    );

    if (!hasSharedLicensee) {
      throw new Error(
        'Managers can only enable/disable accounts for users in their licensee'
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

      // Validate new password strength
      const { validatePasswordStrength } = await import(
        '@/lib/utils/validation'
      );
      const passwordValidation = validatePasswordStrength(passwordObj.new);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password requirements not met: ${passwordValidation.feedback.join(
            ', '
          )}`
        );
      }

      // Hash the new password before saving
      updateFields.password = await hashPassword(passwordObj.new);
      updateFields.passwordUpdatedAt = new Date();
    } else if (typeof updateFields.password === 'string') {
      // Legacy support: if password is a string, validate and hash it
      const { validatePasswordStrength } = await import(
        '@/lib/utils/validation'
      );
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
      // Hash the password before saving
      updateFields.password = await hashPassword(updateFields.password);
      updateFields.passwordUpdatedAt = new Date();
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

  // No longer syncing to old fields - only using assignedLocations and assignedLicensees
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
      !currentUserRoles.includes('developer') &&
      !currentUserRoles.includes('admin') &&
      !currentUserRoles.includes('manager');

    if (isLocationAdmin) {
      const targetUserRoles = (userToDelete.roles || []) as string[];
      const normalizedTargetRoles = targetUserRoles.map(r =>
        String(r).trim().toLowerCase()
      );
      const isTargetDeveloper = normalizedTargetRoles.includes('developer');
      const isTargetAdmin = normalizedTargetRoles.includes('admin');
      const isTargetManager = normalizedTargetRoles.includes('manager');

      if (isTargetDeveloper || isTargetAdmin || isTargetManager) {
        throw new Error(
          'Location admins cannot delete developers, admins, or managers'
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
        details: `Deleted user "${
          deletedUser.username || deletedUser.emailAddress
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
  ];

  fieldChecks.forEach(({ field, original, updated }) => {
    if (updated !== undefined && updated !== original) {
      changes.push({
        field,
        oldValue: (original as string) || '',
        newValue: (updated as string) || '',
      });
    }
  });

  return changes;
}

