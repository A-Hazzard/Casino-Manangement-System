import {
  containsEmailPattern,
  containsPhonePattern,
  normalizePhoneNumber,
  validateEmail,
  validateNameField,
  validatePasswordStrength,
  validatePhoneNumber,
  isValidDateInput,
  validateProfileField,
  validateOptionalGender,
  validateUsername,
  isPlaceholderEmail,
} from '@/lib/utils/validation';

type NullableString = string | undefined | null;

export type InvalidProfileFields = {
  username?: boolean;
  firstName?: boolean;
  lastName?: boolean;
  otherName?: boolean;
  gender?: boolean;
  emailAddress?: boolean;
  phone?: boolean;
  dateOfBirth?: boolean;
  password?: boolean;
};

export type ProfileValidationReasons = {
  username?: string;
  firstName?: string;
  lastName?: string;
  otherName?: string;
  gender?: string;
  emailAddress?: string;
  phone?: string;
  dateOfBirth?: string;
  password?: string;
};

export type ProfileValidationResult = {
  invalidFields: InvalidProfileFields;
  reasons: ProfileValidationReasons;
  passwordConfirmedStrong?: boolean;
};

type ProfileLike = {
  username?: NullableString;
  emailAddress?: NullableString;
  profile?: {
    firstName?: NullableString;
    lastName?: NullableString;
    otherName?: NullableString;
    gender?: NullableString;
    phoneNumber?: NullableString;
    contact?: {
      phone?: NullableString;
      mobile?: NullableString;
    };
    identification?: {
      dateOfBirth?: Date | string | null;
    };
  };
  passwordUpdatedAt?: Date | string | null;
};

function normalizeNullable(value: NullableString): string {
  return value?.trim() ?? '';
}

function extractPhone(profile?: ProfileLike['profile']): string {
  const candidates: Array<NullableString> = [
    profile?.phoneNumber,
    profile?.contact?.phone,
    profile?.contact?.mobile,
  ];

  const phone = candidates.find(
    value => typeof value === 'string' && value.trim() !== ''
  );

  return phone ? phone.toString() : '';
}

function extractDateOfBirth(
  identification?: { dateOfBirth?: Date | string | null }
): string {
  const value = identification?.dateOfBirth;
  if (!value) return '';

  const date =
    value instanceof Date
      ? value
      : typeof value === 'string'
        ? new Date(value)
        : null;

  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
}

type ValidationOptions = {
  rawPassword?: string;
};

export function getInvalidProfileFields(
  user: ProfileLike,
  options: ValidationOptions = {}
): ProfileValidationResult {
  const username = normalizeNullable(user.username);
  const firstName = normalizeNullable(user.profile?.firstName);
  const lastName = normalizeNullable(user.profile?.lastName);
  const otherName = normalizeNullable(user.profile?.otherName);
  const gender = normalizeNullable(user.profile?.gender)?.toLowerCase();
  const emailAddress = normalizeNullable(user.emailAddress);
  const phone = extractPhone(user.profile);
  const dateOfBirth = extractDateOfBirth(user.profile?.identification);

  const normalizedPhone = normalizePhoneNumber(phone || '');

  const invalidFields: InvalidProfileFields = {};
  const reasons: ProfileValidationReasons = {};

  if (
    !username ||
    !validateUsername(username) ||
    Boolean(
      emailAddress &&
        username &&
        username.toLowerCase() === emailAddress.toLowerCase()
    )
  ) {
    invalidFields.username = true;
    if (!username) {
      reasons.username = 'Username is required.';
    } else if (containsPhonePattern(username)) {
      reasons.username =
        'Username cannot look like a phone number. Please choose a unique username.';
    } else if (containsEmailPattern(username)) {
      reasons.username =
        'Username cannot look like an email address. Pick something distinct.';
    } else if (!validateProfileField(username)) {
      reasons.username =
        'Only letters, numbers, spaces, hyphens, and apostrophes are allowed.';
    } else if (
      emailAddress &&
      username.toLowerCase() === emailAddress.toLowerCase()
    ) {
      reasons.username =
        'Username must be different from your email address.';
    } else {
      reasons.username = 'Please update your username.';
    }
  }

  if (!firstName || !validateNameField(firstName)) {
    invalidFields.firstName = true;
    if (!firstName) {
      reasons.firstName = 'First name is required.';
    } else if (containsPhonePattern(firstName)) {
      reasons.firstName =
        'First name cannot look like a phone number.';
    } else {
      reasons.firstName =
        'First name may only include letters and spaces.';
    }
  }

  if (!lastName || !validateNameField(lastName)) {
    invalidFields.lastName = true;
    if (!lastName) {
      reasons.lastName = 'Last name is required.';
    } else if (containsPhonePattern(lastName)) {
      reasons.lastName =
        'Last name cannot look like a phone number.';
    } else {
      reasons.lastName =
        'Last name may only include letters and spaces.';
    }
  }

  if (otherName && !validateNameField(otherName)) {
    invalidFields.otherName = true;
    if (containsPhonePattern(otherName)) {
      reasons.otherName =
        'Other name cannot look like a phone number.';
    } else {
      reasons.otherName =
        'Other name may only include letters and spaces.';
    }
  }

  if (gender && !validateOptionalGender(gender)) {
    invalidFields.gender = true;
    reasons.gender = 'Select a valid gender option.';
  }

  if (!dateOfBirth || !isValidDateInput(dateOfBirth)) {
    invalidFields.dateOfBirth = true;
    reasons.dateOfBirth = !dateOfBirth
      ? 'Date of birth is required.'
      : 'Provide a valid date of birth.';
  } else {
    const dobDate = new Date(dateOfBirth);
    if (dobDate > new Date()) {
      invalidFields.dateOfBirth = true;
      reasons.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }

  if (
    !validateEmail(emailAddress) ||
    Boolean(
      username &&
        username.length > 0 &&
        emailAddress.toLowerCase() === username.toLowerCase()
    ) ||
    containsPhonePattern(emailAddress) ||
    isPlaceholderEmail(emailAddress)
  ) {
    invalidFields.emailAddress = true;
    if (!emailAddress) {
      reasons.emailAddress = 'Email address is required.';
    } else if (!validateEmail(emailAddress)) {
      reasons.emailAddress = 'Provide a valid email address.';
    } else if (isPlaceholderEmail(emailAddress)) {
      reasons.emailAddress =
        'Please use a real email address. Placeholder emails like example@example.com are not allowed.';
    } else if (
      username &&
      emailAddress.toLowerCase() === username.toLowerCase()
    ) {
      reasons.emailAddress =
        'Email address must be different from your username.';
    } else if (containsPhonePattern(emailAddress)) {
      reasons.emailAddress =
        'Email address cannot look like a phone number.';
    } else {
      reasons.emailAddress = 'Please update your email address.';
    }
  }

  if (
    !validatePhoneNumber(phone) ||
    containsEmailPattern(phone) ||
    (!!username && normalizePhoneNumber(username) === normalizedPhone)
  ) {
    invalidFields.phone = true;
    if (!phone) {
      reasons.phone = 'Phone number is required.';
    } else if (!validatePhoneNumber(phone)) {
      reasons.phone =
        'Provide a valid phone number (digits, spaces, parentheses, hyphen, optional leading +).';
    } else if (containsEmailPattern(phone)) {
      reasons.phone =
        'Phone number cannot contain email-like patterns.';
    } else if (
      username &&
      normalizePhoneNumber(username) === normalizedPhone
    ) {
      reasons.phone =
        'Phone number cannot match your username.';
    } else {
      reasons.phone = 'Please review your phone number.';
    }
  }

  const passwordValidation = options.rawPassword
    ? validatePasswordStrength(options.rawPassword)
    : null;

  if (!user.passwordUpdatedAt) {
    if (passwordValidation && passwordValidation.isValid) {
      // Treat as valid if we can confirm current password meets strength rules
      // No action needed, but note for caller
      return {
        invalidFields,
        reasons,
        passwordConfirmedStrong: true,
      };
    } else {
      invalidFields.password = true;
      reasons.password =
        passwordValidation && !passwordValidation.isValid
          ? passwordValidation.feedback.join(', ')
          : 'Password must be updated to meet current strength requirements.';
    }
  } else if (passwordValidation && !passwordValidation.isValid) {
    invalidFields.password = true;
    reasons.password = passwordValidation.feedback.join(', ');
  } else if (passwordValidation?.isValid) {
    return { invalidFields, reasons, passwordConfirmedStrong: true };
  }

  return { invalidFields, reasons };
}

export function hasInvalidProfileFields(
  fields: InvalidProfileFields | undefined | null
): boolean {
  if (!fields) return false;
  return Object.values(fields).some(Boolean);
}

