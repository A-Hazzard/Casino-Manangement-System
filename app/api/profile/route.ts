/**
 * PUT /api/profile
 *
 * Updates the authenticated user's profile. Called from the profile settings
 * page when the user saves personal information or changes their password.
 * Admin and developer roles may also update their own licencee and location
 * assignments via this endpoint. Any change to password, licencees, or
 * locations increments sessionVersion to force re-authentication on other
 * sessions. Duplicate username/email checks are enforced across all users.
 * Cashiers using a temporary password may skip providing currentPassword on
 * their first password change.
 *
 * Body fields:
 * @param username      {string}   Required. New or unchanged username.
 * @param firstName     {string}   Required. First name; letters and spaces only.
 * @param lastName      {string}   Required. Last name; letters and spaces only.
 * @param emailAddress  {string}   Required. Email address.
 * @param phone         {string}   Required. Phone number (digits, spaces, hyphens, parens, leading +).
 * @param otherName     {string}   Optional. Middle or other name.
 * @param gender        {string}   Optional. Gender value; validated when explicitly sent.
 * @param dateOfBirth   {string}   Optional. ISO date string (YYYY-MM-DD); must not be in the future.
 * @param currentPassword {string} Conditional. Current password; required for non-cashier password
 *   changes. Cashiers on a temporary password may omit this field.
 * @param newPassword   {string}   Conditional. Required when changing password; must meet strength
 *   requirements and must not match the current or last 2 passwords.
 * @param confirmPassword {string} Conditional. Must match newPassword exactly.
 * @param licenceeIds   {string[]} Optional. Admin/developer only — replace assigned licencees.
 * @param locationIds   {string[]} Optional. Admin/developer only — replace assigned locations.
 *
 * @module app/api/profile/route
 */

import { getUserIdFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import UserModel from '@/app/api/lib/models/user';
import { hashPassword } from '@/app/api/lib/utils/validation';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { NextRequest, NextResponse } from 'next/server';
import type { ProfileUpdatePayload } from '@/shared/types/users';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { getInvalidProfileFields, hasInvalidProfileFields } from '@/app/api/lib/helpers/profileValidation';
import {
  normalizeProfileFields,
  validateProfileFields,
  validateNonAdminAssignments,
  checkDuplicateUsernameEmail,
  verifyCurrentPassword,
  checkPasswordAgainstHistory,
  normalizeIdArray,
  canManageAssignments,
  getExistingAssignments,
  buildUpdateOperation,
} from '@/app/api/lib/helpers/profileOperations';

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PUT /api/profile';
  const logUser = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and get user ID
    // ============================================================================
    const userId = await getUserIdFromServer();
    if (!userId) {
      logRouteError(functionName, 'PUT', '/api/profile', 'Unauthorized', logUser);
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Invalid or missing session' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 3: Parse and validate request body
    // ============================================================================
    const body = (await request.json()) as ProfileUpdatePayload;
    const fields = normalizeProfileFields(body);

    // ============================================================================
    // STEP 4: Fetch user for validation and security checks
    // ============================================================================
    const user = await UserModel.findOne({ _id: userId }).select('+password');
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const isTemporaryPassword = user.tempPasswordChanged === false;

    // ============================================================================
    // STEP 5: Validate all profile fields
    // ============================================================================
    const { isValid, errors, passwordChangeRequested } = validateProfileFields(
      fields,
      body.gender,
      isTemporaryPassword
    );

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 6: Check non-admin assignment restrictions
    // ============================================================================
    const userRoles = (user.roles as string[] | undefined)?.map(role =>
      String(role).toLowerCase()
    ) || [];
    const hasAssignmentPermission = canManageAssignments(userRoles);

    const requestedLicenceeIds = normalizeIdArray(body.licenceeIds);
    const requestedLocationIds = normalizeIdArray(body.locationIds);

    if (!hasAssignmentPermission) {
      const assignmentErrors = validateNonAdminAssignments(
        requestedLicenceeIds,
        requestedLocationIds
      );
      if (Object.keys(assignmentErrors).length > 0) {
        return NextResponse.json(
          { success: false, message: 'Validation failed', errors: assignmentErrors },
          { status: 400 }
        );
      }
    }

    // ============================================================================
    // STEP 7: Check for duplicate username/email
    // ============================================================================
    const duplicateResult = await checkDuplicateUsernameEmail(
      userId,
      fields.username,
      fields.emailAddress,
      user.username || '',
      user.emailAddress || ''
    );

    if (duplicateResult?.isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          message: duplicateResult.message,
          errors: { [duplicateResult.field as string]: duplicateResult.message },
        },
        { status: 409 }
      );
    }

    // ============================================================================
    // STEP 8: Verify current password if changing password
    // ============================================================================
    const passwordVerifyResult = await verifyCurrentPassword(
      passwordChangeRequested,
      fields.currentPassword,
      user.password || '',
      isTemporaryPassword
    );

    if (!passwordVerifyResult.ok) {
      return NextResponse.json(
        {
          success: false,
          message: passwordVerifyResult.errorMessage,
          errors: passwordVerifyResult.fieldErrors,
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 9: Check password against history
    // ============================================================================
    if (passwordChangeRequested && fields.newPassword) {
      const historyResult = await checkPasswordAgainstHistory(
        fields.newPassword,
        user.password || '',
        (user.previousPasswords as string[]) || []
      );

      if (!historyResult.ok) {
        return NextResponse.json(
          {
            success: false,
            message: historyResult.errorMessage,
            errors: historyResult.fieldErrors,
          },
          { status: 400 }
        );
      }
    } else if (!user.passwordUpdatedAt && !isTemporaryPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'You must set a new password to continue.',
          errors: { newPassword: 'You must set a new password to continue.' },
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 10: Build update operation
    // ============================================================================
    const { existingLicencees, existingLocations } = getExistingAssignments(
      user as { assignedLicencees?: string[]; assignedLocations?: string[] }
    );

    const newPasswordHash = passwordChangeRequested && fields.newPassword
      ? await hashPassword(fields.newPassword)
      : undefined;
    const oldPasswordHash = user.password;

    const { updateSet, unsetMap, incrementSession } = buildUpdateOperation({
      fields,
      existingLicencees,
      existingLocations,
      hasAssignmentPermission,
      passwordChangeRequested,
      isTemporaryPassword,
      newPasswordHash,
      oldPasswordHash,
      requestedLicenceeIds,
      requestedLocationIds,
    });

    const updateOperation: Record<string, unknown> = {
      $set: updateSet,
      $unset: unsetMap,
    };

    if (incrementSession) {
      updateOperation.$inc = { sessionVersion: 1 };
    }

    // ============================================================================
    // STEP 11: Update user in database
    // ============================================================================
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId },
      updateOperation,
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 12: Return updated user with validation status
    // ============================================================================
    const { invalidFields, reasons } = getInvalidProfileFields(updatedUser, {
      rawPassword: fields.newPassword || undefined,
    });
    const requiresProfileUpdate = hasInvalidProfileFields(invalidFields);

    const updatedObject = updatedUser.toObject();
    delete updatedObject.password;

    const duration = Date.now() - startTime;
    logRouteUpdate(functionName, 'PUT', '/api/profile', 1, logUser, duration);

    logActivity({
      action: 'update',
      details: passwordChangeRequested
        ? `User ${user.username} changed their password and updated profile`
        : `User ${user.username} updated their profile`,
      userId: String(userId),
      username: user.username || user.emailAddress || String(userId),
      metadata: {
        resource: 'profile',
        resourceId: String(userId),
        resourceName: user.username || String(userId),
        changes: [
          user.username !== fields.username
            ? { field: 'username', oldValue: user.username, newValue: fields.username }
            : null,
          user.emailAddress !== fields.emailAddress
            ? { field: 'emailAddress', oldValue: user.emailAddress, newValue: fields.emailAddress }
            : null,
          passwordChangeRequested
            ? { field: 'password', oldValue: '[redacted]', newValue: '[redacted]' }
            : null,
          incrementSession
            ? { field: 'sessionVersion', oldValue: 'previous', newValue: 'incremented' }
            : null,
        ].filter(Boolean),
      },
    }).catch(err =>
      logRouteError(functionName, 'PUT', '/api/profile', err instanceof Error ? err : String(err), logUser)
    );

    return NextResponse.json({
      success: true,
      user: {
        _id: updatedObject._id,
        username: updatedObject.username,
        emailAddress: updatedObject.emailAddress,
        profile: updatedObject.profile,
        roles: updatedObject.roles,
        rel: updatedObject.rel,
        isEnabled: updatedObject.isEnabled,
        assignedLocations: updatedObject.assignedLocations || undefined,
        assignedLicencees: updatedObject.assignedLicencees || undefined,
        tempPasswordChanged: updatedObject.tempPasswordChanged,
        requiresProfileUpdate,
        requiresPasswordUpdate: !!invalidFields.password,
        invalidProfileFields: invalidFields,
        invalidProfileReasons: reasons,
      },
      requiresProfileUpdate,
      requiresPasswordUpdate: !!invalidFields.password,
      invalidProfileFields: invalidFields,
      invalidProfileReasons: reasons,
      sessionVersionIncremented: incrementSession,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
    logRouteError(functionName, 'PUT', '/api/profile', errorMessage, logUser);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
