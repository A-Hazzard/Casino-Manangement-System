import type { ResourcePermissions } from '@/lib/types/administration';
import { getCurrentDbConnectionString, getJwtSecret } from '@/lib/utils/auth';
import { getClientIP } from '@/lib/utils/ipAddress';
import {
  isValidDateInput,
  validateAlphabeticField,
  validateNameField,
  validateOptionalGender,
} from '@/lib/utils/validation';
import type {
  CurrentUser,
  OriginalUserType,
  UserDocument,
  UserDocumentWithPassword,
} from '@/shared/types/users';
import { JWTPayload, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { connectDB } from '../middleware/db';
import UserModel from '../models/user';
import { comparePassword, hashPassword } from '../utils/validation';
import { logActivity } from './activityLogger';

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

    // In development, we can be more lenient or provide better error messages
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '🔧 Development mode: Database context mismatch detected. Clear your browser cookies and login again.'
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
      rel?: { licencee?: string[] };
      resourcePermissions?: Record<string, unknown>;
      permissions?: string[];
    };

    let dbUser:
      | {
          sessionVersion?: number;
          roles?: string[];
          rel?: { licencee?: string[] };
          resourcePermissions?: Record<string, unknown>;
          permissions?: string[];
        }
      | null = null;

    if (jwtPayload._id) {
      try {
        await connectDB();
        const UserModel = (await import('../models/user')).default;
        dbUser = (await UserModel.findOne({ _id: jwtPayload._id })
          .select('sessionVersion roles rel resourcePermissions permissions')
          .lean()) as {
          sessionVersion?: number;
          roles?: string[];
          rel?: { licencee?: string[] };
          resourcePermissions?: Record<string, unknown>;
          permissions?: string[];
        } | null;

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
      }
    }

    if (
      !jwtPayload.sessionVersion &&
      dbUser?.sessionVersion !== undefined
    ) {
      jwtPayload.sessionVersion = dbUser.sessionVersion;
    }

    if (dbUser) {
      if (!jwtPayload.roles && Array.isArray(dbUser.roles)) {
        jwtPayload.roles = dbUser.roles;
      }

      if (!jwtPayload.rel && dbUser.rel) {
        jwtPayload.rel = dbUser.rel;
      }

      if (!jwtPayload.resourcePermissions && dbUser.resourcePermissions) {
        jwtPayload.resourcePermissions = dbUser.resourcePermissions;
      }

      if (!jwtPayload.permissions && dbUser.permissions) {
        jwtPayload.permissions = dbUser.permissions;
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
 * Finds a user by email address (case-insensitive).
 *
 * @param emailAddress - The email address to search for.
 * @returns Promise resolving to a UserDocument or null if not found.
 */
export async function getUserByEmail(
  emailAddress: string
): Promise<UserDocumentWithPassword | null> {
  return UserModel.findOne({
    emailAddress: { $regex: new RegExp(`^${emailAddress}$`, 'i') },
  });
}

/**
 * Finds a user by username (case-insensitive).
 */
export async function getUserByUsername(
  username: string
): Promise<UserDocumentWithPassword | null> {
  return UserModel.findOne({
    username: { $regex: new RegExp(`^${username}$`, 'i') },
  });
}

/**
 * Formats user data for frontend consumption
 */
export function formatUsersForResponse(users: UserDocument[]) {
  return users.map((user: UserDocument) => ({
    _id: user._id,
    name: `${user.profile?.firstName ?? ''} ${
      user.profile?.lastName ?? ''
    }`.trim(),
    username: user.username,
    email: user.emailAddress,
    enabled: user.isEnabled,
    roles: user.roles,
    profilePicture: user.profilePicture ?? null,
  }));
}

/**
 * Retrieves all users from database
 */
export async function getAllUsers() {
  return await UserModel.find(
    {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    },
    '-password'
  );
}

/**
 * Retrieves a user by ID from database
 * Note: _id is stored as String in the schema, not ObjectId
 */
export async function getUserById(userId: string) {
  return await UserModel.findOne({ _id: userId }, '-password');
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
    resourcePermissions?: ResourcePermissions;
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
    resourcePermissions = {},
  } = data;

  const existingUser = await UserModel.findOne({
    $or: [{ username }, { emailAddress }],
  });

  if (existingUser) {
    throw new Error('Username or email already exists');
  }

  const hashedPassword = await hashPassword(password);
  const newUser = await UserModel.create({
    _id: new (await import('mongoose')).default.Types.ObjectId().toHexString(),
    username,
    emailAddress,
    password: hashedPassword,
    passwordUpdatedAt: new Date(),
    roles,
    profile,
    isEnabled,
    profilePicture,
    resourcePermissions,
    deletedAt: new Date(-1), // SMIB boards require all fields to be present
  });

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

  // Get current user to check permissions (early check for manager restrictions)
  const requestingUser = await getUserFromServer();
  const requestingUserRoles = (requestingUser?.roles || []) as string[];
  const isAdmin = requestingUserRoles.some(role => ['admin', 'developer'].includes(role));
  const isManager = requestingUserRoles.includes('manager') && !isAdmin;

  // Prevent managers from changing licensee assignments
  if (isManager && updateFields.rel && typeof updateFields.rel === 'object') {
    const relUpdate = updateFields.rel as Record<string, unknown>;
    if (relUpdate.licencee !== undefined) {
      // Get original licensee assignments
      const originalLicensees = (user.rel as { licencee?: string[] })?.licencee || [];
      const newLicensees = Array.isArray(relUpdate.licencee) 
        ? relUpdate.licencee.map(id => String(id))
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
        if (trimmed && !validateNameField(trimmed)) {
          throw new Error(
            `${label} may only contain letters and spaces and cannot resemble a phone number.`
          );
        }
        profileUpdate[key] = trimmed;
      }
    };

    sanitizeNameField('firstName', 'First name');
    sanitizeNameField('lastName', 'Last name');
    sanitizeNameField('middleName', 'Middle name');
    sanitizeNameField('otherName', 'Other name');

    if (typeof profileUpdate.gender === 'string') {
      const genderValue = profileUpdate.gender.trim().toLowerCase();
      if (genderValue && !validateOptionalGender(genderValue)) {
        throw new Error('Select a valid gender option.');
      }
      profileUpdate.gender = genderValue;
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
        if (trimmed && !validateAlphabeticField(trimmed)) {
          throw new Error(
            'Identification type may only contain letters and spaces.'
          );
        }
        identificationUpdate.idType = trimmed;
      }

      const dobValue = identificationUpdate.dateOfBirth;
      if (!dobValue) {
        throw new Error('Date of birth is required.');
      }
      const parsedDate =
        dobValue instanceof Date ? dobValue : new Date(dobValue as string);
      if (!isValidDateInput(parsedDate)) {
        throw new Error('Date of birth must be a valid date.');
      }
      if (parsedDate > new Date()) {
        throw new Error('Date of birth cannot be in the future.');
      }
      identificationUpdate.dateOfBirth = parsedDate;

      profileUpdate.identification = identificationUpdate;
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

  console.log(
    '[updateUser] Update operation:',
    JSON.stringify(updateOperation, null, 2)
  );

  // Update user
  const updatedUser = await UserModel.findOneAndUpdate(
    { _id },
    updateOperation,
    { new: true }
  );

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

  const currentUser = await getUserFromServer();
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
      field: 'middleName',
      original: originalUser.profile?.middleName,
      updated: getUpdatedValue('middleName'),
    },
    {
      field: 'otherName',
      original: originalUser.profile?.otherName,
      updated: getUpdatedValue('otherName'),
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
