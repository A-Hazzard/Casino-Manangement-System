/**
 * Profile Operations
 *
 * Helpers for the profile update endpoint (PUT /api/profile).
 * Handles field normalization, validation, duplicate checking,
 * password verification, assignment parsing, and update building.
 *
 * @module app/api/lib/helpers/profileOperations
 */

// ============================================================================
// Imports
// ============================================================================

import UserModel from '@/app/api/lib/models/user';
import { comparePassword } from '@/app/api/lib/utils/validation';
import {
  containsEmailPattern,
  isValidDateInput,
  normalizePhoneNumber,
  validateEmail,
  validateNameField,
  validateOptionalGender,
  validatePasswordStrength,
  validatePhoneNumber,
  validateUsername,
} from '@/lib/utils/validation';
import type { ProfileUpdatePayload } from '@/shared/types/users';

// ============================================================================
// Types
// ============================================================================

export type NormalizedProfileFields = {
  username: string;
  firstName: string;
  lastName: string;
  otherName: string;
  gender: string;
  emailAddress: string;
  phone: string;
  dateOfBirth: string;
  newPassword: string;
  confirmPassword: string;
  currentPassword: string;
};

export type ProfileValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
  passwordChangeRequested: boolean;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  field?: string;
  message?: string;
};

export type PasswordVerifyResult = {
  ok: boolean;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
  shouldIncrementSession?: boolean;
  passwordHash?: string;
  oldPasswordHash?: string;
};

export type BuildUpdateResult = {
  updateSet: Record<string, unknown>;
  unsetMap: Record<string, ''>;
  incrementSession: boolean;
};

// ============================================================================
// Field Normalization
// ============================================================================

/**
 * Normalizes and trims all profile update fields from the request body.
 *
 * @param {ProfileUpdatePayload} body - Raw profile update payload
 * @returns {NormalizedProfileFields} Normalized fields object
 */
export function normalizeProfileFields(
  body: ProfileUpdatePayload
): NormalizedProfileFields {
  return {
    username: body.username?.trim() || '',
    firstName: body.firstName?.trim() || '',
    lastName: body.lastName?.trim() || '',
    otherName: body.otherName?.trim() || '',
    gender: body.gender?.trim().toLowerCase() || '',
    emailAddress: body.emailAddress?.trim() || '',
    phone: body.phone?.trim() || '',
    dateOfBirth: body.dateOfBirth?.trim() || '',
    newPassword: body.newPassword?.trim() || '',
    confirmPassword: body.confirmPassword?.trim() || '',
    currentPassword: body.currentPassword?.trim() || '',
  };
}

// ============================================================================
// Field Validation
// ============================================================================

/**
 * Validates all profile fields and returns a result with errors and password change status.
 *
 * @param {NormalizedProfileFields} fields - Normalized profile fields
 * @param {unknown} bodyGender - Raw gender value from request body
 * @param {boolean} isTemporaryPassword - Whether user has a temporary password
 * @returns {ProfileValidationResult} Validation result with errors array
 */
export function validateProfileFields(
  fields: NormalizedProfileFields,
  bodyGender: unknown,
  isTemporaryPassword: boolean
): ProfileValidationResult {
  const errors: Record<string, string> = {};

  const {
    username,
    firstName,
    lastName,
    otherName,
    gender,
    emailAddress,
    phone,
    dateOfBirth,
    newPassword,
    confirmPassword,
  } = fields;

  if (!validateUsername(username)) {
    errors.username =
      'Username must use letters/numbers and cannot look like an email or phone number.';
  }

  if (firstName && !validateNameField(firstName)) {
    errors.firstName =
      'First name may only contain letters and spaces and cannot resemble a phone number.';
  }

  if (lastName && !validateNameField(lastName)) {
    errors.lastName =
      'Last name may only contain letters and spaces and cannot resemble a phone number.';
  }

  if (otherName && !validateNameField(otherName)) {
    errors.otherName =
      'Other name may only contain letters and spaces and cannot resemble a phone number.';
  }

  if (
    bodyGender !== undefined &&
    bodyGender !== '' &&
    (!gender || !validateOptionalGender(gender))
  ) {
    errors.gender = !gender
      ? 'Gender is required.'
      : 'Select a valid gender option.';
  }

  if (emailAddress && !validateEmail(emailAddress)) {
    errors.emailAddress = 'Provide a valid email address.';
  } else if (
    emailAddress &&
    (containsEmailPattern(username) ||
      emailAddress.toLowerCase() === username.toLowerCase())
  ) {
    errors.emailAddress =
      'Email address must differ from username and other identifiers.';
  }

  if (phone && !validatePhoneNumber(phone)) {
    errors.phone =
      'Provide a valid phone number (digits, spaces, hyphen, parentheses, optional leading +).';
  } else if (
    phone &&
    normalizePhoneNumber(phone) === normalizePhoneNumber(username)
  ) {
    errors.phone = 'Phone number cannot match the username.';
  }

  if (dateOfBirth) {
    if (!isValidDateInput(dateOfBirth)) {
      errors.dateOfBirth = 'Provide a valid date of birth.';
    } else {
      const parsedDob = new Date(dateOfBirth);
      const today = new Date();
      if (parsedDob > today) {
        errors.dateOfBirth = 'Date of birth cannot be in the future.';
      }
    }
  }

  const passwordChangeRequested =
    !!newPassword || !!confirmPassword || !!fields.currentPassword;

  if (passwordChangeRequested) {
    if (!isTemporaryPassword && !fields.currentPassword) {
      errors.currentPassword = 'Current password is required.';
    }
    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    } else if (newPassword) {
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        errors.newPassword = passwordValidation.feedback.join(', ');
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    passwordChangeRequested,
  };
}

// ============================================================================
// Non-admin Assignment Validation
// ============================================================================

/**
 * Validates that non-admin users have at least one licencee and location assigned.
 *
 * @param {string[] | undefined} requestedLicenceeIds - Requested licencee assignments
 * @param {string[] | undefined} requestedLocationIds - Requested location assignments
 * @returns {Record<string, string>} Object with field-level error messages
 */
export function validateNonAdminAssignments(
  requestedLicenceeIds: string[] | undefined,
  requestedLocationIds: string[] | undefined
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (requestedLicenceeIds !== undefined && requestedLicenceeIds.length === 0) {
    errors.licenceeIds =
      'Please contact your Administrator or Tech Support to be assigned to a licencee.';
  }
  if (requestedLocationIds !== undefined && requestedLocationIds.length === 0) {
    errors.locationIds =
      'Please contact your Administrator or Tech Support to be assigned to a location.';
  }

  return errors;
}

// ============================================================================
// Duplicate Check
// ============================================================================

/**
 * Checks if the requested username or email address is already in use by another user.
 *
 * @param {string} userId - Current user ID to exclude from checks
 * @param {string} username - Requested username
 * @param {string} emailAddress - Requested email address
 * @param {string} currentUsername - Current username for comparison
 * @param {string} currentEmail - Current email for comparison
 * @returns {Promise<DuplicateCheckResult | null>} Duplicate check result or null
 */
export async function checkDuplicateUsernameEmail(
  userId: string,
  username: string,
  emailAddress: string,
  currentUsername: string,
  currentEmail: string
): Promise<DuplicateCheckResult | null> {
  if (username.toLowerCase() !== currentUsername.toLowerCase()) {
    const existing = await UserModel.findOne({
      _id: { $ne: userId },
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    });
    if (existing) {
      return {
        isDuplicate: true,
        field: 'username',
        message: 'Username already in use',
      };
    }
  }

  if (emailAddress.toLowerCase() !== currentEmail.toLowerCase()) {
    const existing = await UserModel.findOne({
      _id: { $ne: userId },
      emailAddress: { $regex: new RegExp(`^${emailAddress}$`, 'i') },
    });
    if (existing) {
      return {
        isDuplicate: true,
        field: 'emailAddress',
        message: 'Email address already in use',
      };
    }
  }

  return { isDuplicate: false };
}

// ============================================================================
// Password Verification
// ============================================================================

/**
 * Verifies the current password matches the stored hash.
 *
 * @param {boolean} passwordChangeRequested - Whether a password change was requested
 * @param {string} currentPassword - Current password input from user
 * @param {string} userPassword - Stored password hash
 * @param {boolean} isTemporaryPassword - Whether the user has a temporary password
 * @returns {Promise<PasswordVerifyResult>} Verification result
 */
export async function verifyCurrentPassword(
  passwordChangeRequested: boolean,
  currentPassword: string,
  userPassword: string,
  isTemporaryPassword: boolean
): Promise<PasswordVerifyResult> {
  if (!passwordChangeRequested) {
    return { ok: true };
  }

  if (currentPassword) {
    const matches = await comparePassword(currentPassword, userPassword || '');
    if (!matches) {
      return {
        ok: false,
        errorMessage: isTemporaryPassword
          ? 'Current password is incorrect. Please check the password given to you.'
          : 'Current password is incorrect.',
        fieldErrors: { currentPassword: 'Current password is incorrect.' },
      };
    }
  } else if (!isTemporaryPassword) {
    return {
      ok: false,
      errorMessage: 'Current password is required.',
      fieldErrors: { currentPassword: 'Current password is required.' },
    };
  }

  return { ok: true };
}

/**
 * Checks that the new password does not match the current or last 2 passwords.
 *
 * @param {string} newPassword - Proposed new password
 * @param {string} currentHashedPassword - Current password hash
 * @param {string[]} previousPasswords - Array of previous password hashes
 * @returns {Promise<PasswordVerifyResult>} Check result
 */
export async function checkPasswordAgainstHistory(
  newPassword: string,
  currentHashedPassword: string,
  previousPasswords: string[]
): Promise<PasswordVerifyResult> {
  if (await comparePassword(newPassword, currentHashedPassword || '')) {
    return {
      ok: false,
      errorMessage: 'New password cannot be the same as current password.',
      fieldErrors: {
        newPassword: 'New password cannot be the same as current password.',
      },
    };
  }

  if (previousPasswords && Array.isArray(previousPasswords)) {
    for (const prevHashed of previousPasswords) {
      if (await comparePassword(newPassword, prevHashed)) {
        return {
          ok: false,
          errorMessage:
            'New password cannot match any of your last 2 passwords.',
          fieldErrors: {
            newPassword:
              'New password cannot match any of your last 2 passwords.',
          },
        };
      }
    }
  }

  return { ok: true };
}

// ============================================================================
// Assignment Helpers
// ============================================================================

/**
 * Normalizes an unknown value into a deduplicated, trimmed string array.
 * Returns undefined if the result would be empty.
 *
 * @param {unknown} value - Raw value to normalize
 * @returns {string[] | undefined} Cleaned string array or undefined
 */
export function normalizeIdArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = Array.from(
    new Set(
      value
        .map(item =>
          typeof item === 'string'
            ? item.trim()
            : item != null
              ? String(item)
              : ''
        )
        .filter(Boolean)
    )
  );
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Checks whether the given roles can manage licencee/location assignments.
 *
 * @param {string[]} roles - User's role array
 * @returns {boolean} True if user can manage assignments
 */
export function canManageAssignments(roles: string[]): boolean {
  return (
    roles.includes('admin') ||
    roles.includes('developer') ||
    roles.includes('owner')
  );
}

/**
 * Extracts the user's current licencee and location assignments.
 *
 * @param {{ assignedLicencees?: string[]; assignedLocations?: string[] }} user - User object
 * @returns {{ existingLicencees: string[]; existingLocations: string[] }} Current assignments
 */
export function getExistingAssignments(user: {
  assignedLicencees?: string[];
  assignedLocations?: string[];
}): { existingLicencees: string[]; existingLocations: string[] } {
  const existingLicencees = (user.assignedLicencees || []).map(id =>
    String(id)
  );
  const existingLocations = (user.assignedLocations || []).map(id =>
    String(id)
  );
  return { existingLicencees, existingLocations };
}

const sortIds = (arr: string[]): string[] => [...arr].sort();

const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

// ============================================================================
// Build Update Operation
// ============================================================================

export type BuildUpdateParams = {
  fields: NormalizedProfileFields;
  existingLicencees: string[];
  existingLocations: string[];
  hasAssignmentPermission: boolean;
  passwordChangeRequested: boolean;
  isTemporaryPassword: boolean;
  newPasswordHash?: string;
  oldPasswordHash?: string;
  requestedLicenceeIds?: string[];
  requestedLocationIds?: string[];
};

/**
 * Builds the MongoDB update operation ($set, $unset) based on profile changes.
 * Determines whether session version should be incremented.
 *
 * @param {BuildUpdateParams} params - Update parameters including fields and assignments
 * @returns {BuildUpdateResult} Update operation with set, unset, and incrementSession flag
 */
export function buildUpdateOperation(
  params: BuildUpdateParams
): BuildUpdateResult {
  const {
    fields,
    passwordChangeRequested,
    isTemporaryPassword,
    newPasswordHash,
    oldPasswordHash,
    existingLicencees,
    existingLocations,
    hasAssignmentPermission,
    requestedLicenceeIds,
    requestedLocationIds,
  } = params;

  const updateSet: Record<string, unknown> = {
    username: fields.username,
    emailAddress: fields.emailAddress,
    'profile.firstName': fields.firstName,
    'profile.lastName': fields.lastName,
    'profile.phoneNumber': fields.phone,
  };

  if (fields.dateOfBirth) {
    updateSet['profile.identification.dateOfBirth'] = new Date(
      fields.dateOfBirth
    );
  }

  const unsetMap: Record<string, ''> = {
    'profile.contact': '',
    'profile.phone': '',
  };

  if (fields.otherName) {
    updateSet['profile.otherName'] = fields.otherName;
  } else {
    unsetMap['profile.otherName'] = '';
  }

  if (fields.gender) {
    updateSet['profile.gender'] = fields.gender;
  } else {
    unsetMap['profile.gender'] = '';
  }

  let incrementSession = false;

  if (passwordChangeRequested && newPasswordHash) {
    updateSet.password = newPasswordHash;
    updateSet.passwordUpdatedAt = new Date();
    updateSet.tempPasswordChanged = true;
    updateSet.previousPassword = oldPasswordHash;
    updateSet.requiresPasswordUpdate = false;
    unsetMap.tempPassword = '';

    const allPrevious = [...(oldPasswordHash ? [oldPasswordHash] : [])];
    if (oldPasswordHash) {
      allPrevious.push(oldPasswordHash);
    }
    updateSet.previousPasswords = Array.from(new Set(allPrevious)).slice(-2);

    if (!isTemporaryPassword) {
      incrementSession = true;
    }
  }

  if (hasAssignmentPermission && requestedLicenceeIds !== undefined) {
    updateSet.assignedLicencees = requestedLicenceeIds;
    const sortedExisting = sortIds(existingLicencees);
    const sortedRequested = sortIds(requestedLicenceeIds);
    if (!arraysEqual(sortedRequested, sortedExisting)) {
      incrementSession = true;
    }
  }

  if (hasAssignmentPermission && requestedLocationIds !== undefined) {
    updateSet.assignedLocations = requestedLocationIds;
    const sortedExisting = sortIds(existingLocations);
    const sortedRequested = sortIds(requestedLocationIds);
    if (!arraysEqual(sortedRequested, sortedExisting)) {
      incrementSession = true;
    }
  }

  return { updateSet, unsetMap, incrementSession };
}
