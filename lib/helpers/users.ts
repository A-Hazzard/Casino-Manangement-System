/**
 * Users Helper Functions
 *
 * Provides helper functions for user management, including CRUD operations,
 * user lookup, data formatting, and activity logging. It handles all operations
 * related to user accounts and their management.
 *
 * Features:
 * - Finds users by email address or username (case-insensitive).
 * - Formats user data for frontend consumption.
 * - Retrieves all users from the database.
 * - Creates, updates, and deletes users with activity logging.
 * - Handles password hashing and user permissions.
 */

import { NextRequest } from 'next/server';
import UserModel from '../../app/api/lib/models/user';
import { hashPassword } from '../utils/password';
import type { ResourcePermissions } from '@/lib/types/administration';
import { logActivity } from './activityLogger';
import { getClientIP } from '@/lib/utils/ipAddress';
import type {
  UserDocument,
  UserDocumentWithPassword,
  OriginalUserType,
} from '../types/users';

// ============================================================================
// User Lookup Functions
// ============================================================================

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

// ============================================================================
// User Data Formatting
// ============================================================================

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

// ============================================================================
// User Data Retrieval
// ============================================================================

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
    roles,
    profile,
    isEnabled,
    profilePicture,
    resourcePermissions,
    deletedAt: new Date(-1), // SMIB boards require all fields to be present
  });

  // Log user creation activity
  try {
    const clientIP = getClientIP(request) || 'unknown';
    await logActivity(
      { id: 'system', email: 'system', role: 'system' }, // actor
      'user_created', // actionType
      'user', // entityType
      { id: newUser._id, name: newUser.username }, // entity
      [], // changes
      `User created: ${newUser.username} (${newUser.emailAddress})`, // description
      clientIP || undefined // ipAddress
    );
  } catch (error) {
    console.error('Failed to log user creation activity:', error);
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
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const user = await UserModel.findOne({ _id });
  if (!user) {
    throw new Error('User not found');
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
  
  console.log('[updateUser] Update operation:', JSON.stringify(updateOperation, null, 2));

  // Update user
  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  const updatedUser = await UserModel.findOneAndUpdate(
    { _id },
    updateOperation,
    { new: true }
  );

  // Log user update activity
  try {
    const clientIP = getClientIP(request) || 'unknown';
    await logActivity(
      { id: 'system', email: 'system', role: 'system' }, // actor
      'user_updated', // actionType
      'user', // entityType
      { id: _id, name: user.username }, // entity
      changes, // changes
      `User updated: ${user.username}`, // description
      clientIP || undefined // ipAddress
    );
  } catch (error) {
    console.error('Failed to log user update activity:', error);
  }

  return updatedUser;
}

/**
 * Deletes a user with activity logging (soft delete)
 */
export async function deleteUser(_id: string, request: NextRequest) {
  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
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

  // Log user deletion activity
  try {
    const clientIP = getClientIP(request) || 'unknown';
    await logActivity(
      { id: 'system', email: 'system', role: 'system' }, // actor
      'user_deleted', // actionType
      'user', // entityType
      { id: _id, name: deletedUser.username }, // entity
      [], // changes
      `User deleted: ${deletedUser.username} (${deletedUser.emailAddress})`, // description
      clientIP || undefined // ipAddress
    );
  } catch (error) {
    console.error('Failed to log user deletion activity:', error);
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

  const fieldChecks = [
    {
      field: 'firstName',
      original: originalUser.profile?.firstName,
      updated: updateFields.firstName,
    },
    {
      field: 'lastName',
      original: originalUser.profile?.lastName,
      updated: updateFields.lastName,
    },
    {
      field: 'middleName',
      original: originalUser.profile?.middleName,
      updated: updateFields.middleName,
    },
    {
      field: 'otherName',
      original: originalUser.profile?.otherName,
      updated: updateFields.otherName,
    },
    {
      field: 'gender',
      original: originalUser.profile?.gender,
      updated: updateFields.gender,
    },
    {
      field: 'address.street',
      original: originalUser.profile?.address?.street,
      updated: updateFields.street,
    },
    {
      field: 'address.town',
      original: originalUser.profile?.address?.town,
      updated: updateFields.town,
    },
    {
      field: 'address.region',
      original: originalUser.profile?.address?.region,
      updated: updateFields.region,
    },
    {
      field: 'address.country',
      original: originalUser.profile?.address?.country,
      updated: updateFields.country,
    },
    {
      field: 'address.postalCode',
      original: originalUser.profile?.address?.postalCode,
      updated: updateFields.postalCode,
    },
    {
      field: 'identification.dateOfBirth',
      original: originalUser.profile?.identification?.dateOfBirth,
      updated: updateFields.dateOfBirth,
    },
    {
      field: 'identification.idType',
      original: originalUser.profile?.identification?.idType,
      updated: updateFields.idType,
    },
    {
      field: 'identification.idNumber',
      original: originalUser.profile?.identification?.idNumber,
      updated: updateFields.idNumber,
    },
    {
      field: 'identification.notes',
      original: originalUser.profile?.identification?.notes,
      updated: updateFields.notes,
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
