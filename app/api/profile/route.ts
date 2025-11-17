import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getUserIdFromServer } from '@/app/api/lib/helpers/users';
import UserModel from '@/app/api/lib/models/user';
import {
  getInvalidProfileFields,
  hasInvalidProfileFields,
} from '@/app/api/lib/helpers/profileValidation';
import {
  comparePassword,
  hashPassword,
} from '@/app/api/lib/utils/validation';
import {
  containsEmailPattern,
  normalizePhoneNumber,
  validateEmail,
  validateNameField,
  validateOptionalGender,
  validatePasswordStrength,
  validatePhoneNumber,
  validateUsername,
  isValidDateInput,
} from '@/lib/utils/validation';

type ProfileUpdatePayload = {
  username: string;
  firstName: string;
  lastName: string;
  otherName?: string;
  gender?: string;
  emailAddress: string;
  phone: string;
  dateOfBirth: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  licenseeIds?: string[];
  locationIds?: string[];
};

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const userId = await getUserIdFromServer();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ProfileUpdatePayload;
    const errors: Record<string, string> = {};

    const username = body.username?.trim() || '';
    const firstName = body.firstName?.trim() || '';
    const lastName = body.lastName?.trim() || '';
    const otherName = body.otherName?.trim() || '';
    const gender = body.gender?.trim().toLowerCase() || '';
    const emailAddress = body.emailAddress?.trim() || '';
    const phone = body.phone?.trim() || '';
    const dateOfBirth = body.dateOfBirth?.trim() || '';
    const newPassword = body.newPassword?.trim() || '';
    const confirmPassword = body.confirmPassword?.trim() || '';
    const currentPassword = body.currentPassword?.trim() || '';

    if (!validateUsername(username)) {
      errors.username =
        'Username must use letters/numbers and cannot look like an email or phone number.';
    }

    if (!validateNameField(firstName)) {
      errors.firstName =
        'First name may only contain letters and spaces and cannot resemble a phone number.';
    }

    if (!validateNameField(lastName)) {
      errors.lastName =
        'Last name may only contain letters and spaces and cannot resemble a phone number.';
    }

    if (otherName && !validateNameField(otherName)) {
      errors.otherName =
        'Other name may only contain letters and spaces and cannot resemble a phone number.';
    }

    if (gender && !validateOptionalGender(gender)) {
      errors.gender =
        'Select a valid gender option.';
    }

    if (!validateEmail(emailAddress)) {
      errors.emailAddress = 'Provide a valid email address.';
    } else if (containsEmailPattern(username) || emailAddress.toLowerCase() === username.toLowerCase()) {
      errors.emailAddress =
        'Email address must differ from username and other identifiers.';
    }

    if (!validatePhoneNumber(phone)) {
      errors.phone =
        'Provide a valid phone number (digits, spaces, hyphen, parentheses, optional leading +).';
    } else if (
      normalizePhoneNumber(phone) === normalizePhoneNumber(username)
    ) {
      errors.phone = 'Phone number cannot match the username.';
    }

    if (!dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.';
    } else if (!isValidDateInput(dateOfBirth)) {
      errors.dateOfBirth = 'Provide a valid date of birth.';
    } else {
      const parsedDob = new Date(dateOfBirth);
      const today = new Date();
      if (parsedDob > today) {
        errors.dateOfBirth = 'Date of birth cannot be in the future.';
      }
    }

    const passwordChangeRequested =
      !!newPassword || !!confirmPassword || !!currentPassword;

    if (passwordChangeRequested) {
      if (!currentPassword) {
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

    // Fetch user for duplicate checks and password verification
    const user = await UserModel.findOne({ _id: userId }).select('+password');
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const normalizeIdArray = (value: unknown): string[] | undefined => {
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
      return cleaned;
    };

    const requestedLicenseeIds = normalizeIdArray(body.licenseeIds);
    const requestedLocationIds = normalizeIdArray(body.locationIds);

    const existingLicensees =
      Array.isArray(user.rel?.licencee) && user.rel?.licencee
        ? (user.rel?.licencee as unknown[]).map(id => String(id))
        : [];
    const existingLocations =
      user.resourcePermissions?.['gaming-locations']?.resources?.map(
        (id: unknown) => String(id)
      ) || [];

    const userRoles =
      (user.roles as string[] | undefined)?.map(role =>
        String(role).toLowerCase()
      ) || [];
    const canManageAssignments =
      userRoles.includes('admin') || userRoles.includes('developer');

    if (canManageAssignments) {
      // Only validate if the fields are explicitly provided (not undefined)
      // This allows users to update other fields without changing licensees/locations
      if (requestedLicenseeIds !== undefined) {
        if (requestedLicenseeIds.length === 0) {
          errors.licenseeIds = 'Select at least one licensee.';
        }
      }
      if (requestedLocationIds !== undefined) {
        if (requestedLocationIds.length === 0) {
          errors.locationIds = 'Select at least one location.';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors },
        { status: 400 }
      );
    }

    if (
      username.toLowerCase() !== (user.username || '').toLowerCase() &&
      (await UserModel.findOne({
        _id: { $ne: userId },
        username: { $regex: new RegExp(`^${username}$`, 'i') },
      }))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username already in use',
          errors: { username: 'Username already in use' },
        },
        { status: 409 }
      );
    }

    if (
      emailAddress.toLowerCase() !== (user.emailAddress || '').toLowerCase() &&
      (await UserModel.findOne({
        _id: { $ne: userId },
        emailAddress: { $regex: new RegExp(`^${emailAddress}$`, 'i') },
      }))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email address already in use',
          errors: { emailAddress: 'Email address already in use' },
        },
        { status: 409 }
      );
    }

    if (passwordChangeRequested) {
      const matches = await comparePassword(currentPassword, user.password || '');
      if (!matches) {
        return NextResponse.json(
          {
            success: false,
            message: 'Current password is incorrect',
            errors: { currentPassword: 'Current password is incorrect' },
          },
          { status: 400 }
        );
      }
    }

    const updateSet: Record<string, unknown> = {
      username,
      emailAddress,
      'profile.firstName': firstName,
      'profile.lastName': lastName,
      'profile.phoneNumber': phone,
    };

    if (dateOfBirth) {
      updateSet['profile.identification.dateOfBirth'] = new Date(dateOfBirth);
    }

    const unsetMap: Record<string, ''> = {
      'profile.contact': '',
      'profile.phone': '',
    };

    if (otherName) {
      updateSet['profile.otherName'] = otherName;
    } else {
      unsetMap['profile.otherName'] = '';
    }

    if (gender) {
      updateSet['profile.gender'] = gender;
    } else {
      unsetMap['profile.gender'] = '';
    }

    const existingDob =
      user.profile?.identification?.dateOfBirth instanceof Date
        ? user.profile.identification.dateOfBirth
        : user.profile?.identification?.dateOfBirth
          ? new Date(user.profile.identification.dateOfBirth as string | number)
          : null;
    const existingDobString = existingDob
      ? new Date(existingDob).toISOString().split('T')[0]
      : '';

    const updateOperation: Record<string, unknown> = {
      $set: updateSet,
      $unset: unsetMap,
    };

    let incrementSession = false;

    const sortIds = (arr: string[]) => [...arr].sort();
    const arraysEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((value, index) => value === b[index]);

    if (passwordChangeRequested && newPassword) {
      updateSet.password = await hashPassword(newPassword);
      updateSet.passwordUpdatedAt = new Date();
      incrementSession = true;
    } else if (!user.passwordUpdatedAt) {
      // Force user to set a new password if never set before
      return NextResponse.json(
        {
          success: false,
          message: 'You must set a new password to continue.',
          errors: { newPassword: 'You must set a new password to continue.' },
        },
        { status: 400 }
      );
    }

    if (
      username !== user.username ||
      emailAddress !== user.emailAddress ||
      firstName !== (user.profile?.firstName || '') ||
      lastName !== (user.profile?.lastName || '') ||
      otherName !== (user.profile?.otherName || '') ||
      gender !== ((user.profile?.gender as string) || '') ||
      dateOfBirth !== existingDobString
    ) {
      incrementSession = true;
    }

    // Update licensees if user can manage assignments and licenseeIds are provided
    if (canManageAssignments && requestedLicenseeIds !== undefined) {
      updateSet['rel.licencee'] = requestedLicenseeIds;
      const sortedExistingLicensees = sortIds(existingLicensees);
      const sortedRequestedLicensees = sortIds(requestedLicenseeIds);
      if (!arraysEqual(sortedRequestedLicensees, sortedExistingLicensees)) {
        incrementSession = true;
      }
    }

    // Update locations if user can manage assignments and locationIds are provided
    if (canManageAssignments && requestedLocationIds !== undefined) {
      updateSet['resourcePermissions.gaming-locations.entity'] =
        'gaming-locations';
      updateSet['resourcePermissions.gaming-locations.resources'] =
        requestedLocationIds;
      const sortedExistingLocations = sortIds(existingLocations);
      const sortedRequestedLocations = sortIds(requestedLocationIds);
      if (!arraysEqual(sortedRequestedLocations, sortedExistingLocations)) {
        incrementSession = true;
      }
    }

    if (incrementSession) {
      updateOperation.$inc = { sessionVersion: 1 };
    }

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

    const { invalidFields, reasons } = getInvalidProfileFields(
      updatedUser as never,
      { rawPassword: newPassword || undefined }
    );
    const requiresProfileUpdate = hasInvalidProfileFields(invalidFields);

    const updatedObject = updatedUser.toObject();
    delete updatedObject.password;

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
        resourcePermissions: updatedObject.resourcePermissions,
        requiresProfileUpdate,
        invalidProfileFields: invalidFields,
        invalidProfileReasons: reasons,
      },
      requiresProfileUpdate,
      invalidProfileFields: invalidFields,
      invalidProfileReasons: reasons,
    });
  } catch (error) {
    console.error('[profile-update] Error updating profile:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

