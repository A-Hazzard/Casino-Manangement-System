/**
 * Validation Utilities
 *
 * Utility functions for validating user-related input such as emails,
 * passwords, genders, and collection report payloads.
 *
 * Features:
 * - Email format and pattern validation
 * - Placeholder email detection
 * - Password strength validation and feedback
 * - Gender validation
 * - Collection report payload validation helpers
 */

import { UserDocument } from '@/shared/types/auth';
const ALLOWED_GENDERS = ['male', 'female', 'other'] as const;
type AllowedGender = (typeof ALLOWED_GENDERS)[number];

import type { CreateCollectionReportPayload } from '@/lib/types/api';

// ============================================================================
// Email Validation
// ============================================================================
/**
 * Validates if a string is a valid email address.
 *
 * @param emailAddress - The email address to validate.
 * @returns True if valid, false otherwise.
 */
const EMAIL_REGEX = /\S+@\S+\.\S+/;

export function validateEmail(
  emailAddress: UserDocument['emailAddress']
): boolean {
  if (!emailAddress || typeof emailAddress !== 'string') {
    console.error(
      '[validateEmail] emailAddress is required and must be a string'
    );
    return false;
  }
  return EMAIL_REGEX.test(emailAddress);
}

/**
 * Checks if a string looks like an email address by testing against a basic email regex.
 * @param {string} value - The string to check for email patterns.
 * @returns {boolean} True if the value matches an email pattern, false otherwise.
 */
export function containsEmailPattern(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(value.trim());
}

/**
 * Checks if an email address is a placeholder or example email.
 * Detects common patterns like example@example.com, test@test.com, etc.
 * @param {string} email - The email address to check.
 * @returns {boolean} True if the email matches a known placeholder pattern, false otherwise.
 */
export function isPlaceholderEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  const normalized = email.toLowerCase().trim();

  // Common placeholder email patterns
  const placeholderPatterns = [
    /^example\d*@example\.(com|org|net|test)$/i,
    /^test\d*@test\.(com|org|net|example)$/i,
    /^sample\d*@sample\.(com|org|net)$/i,
    /^placeholder\d*@placeholder\.(com|org|net)$/i,
    /^user\d*@example\.(com|org|net|test)$/i,
    /^demo\d*@demo\.(com|org|net)$/i,
    /^temp\d*@temp\.(com|org|net)$/i,
    /^fake\d*@fake\.(com|org|net)$/i,
    /^dummy\d*@dummy\.(com|org|net)$/i,
    /^admin\d*@example\.(com|org|net)$/i,
    /^[a-z]+\d*@example\.(com|org|net|test)$/i, // Any word followed by numbers @example.com
  ];

  return placeholderPatterns.some(pattern => pattern.test(normalized));
}

// ============================================================================
// Password Validation
// ============================================================================

/**
 * Validates if a password meets strength requirements.
 *
 * @param password - The password to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePassword(password: UserDocument['password']): boolean {
  // Minimum 8 characters, at least one uppercase, one lowercase, one number
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
}

/**
 * Validates password strength and returns detailed feedback.
 *
 * @param password - The password to validate.
 * @returns Object with validation result and feedback.
 */
export type PasswordStrengthResult = {
  isValid: boolean;
  score: number; // 0-4 scale
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
};

export function validatePasswordStrength(
  password: string
): PasswordStrengthResult {
  if (!password || typeof password !== 'string') {
    console.error(
      '[validatePasswordStrength] password is required and must be a string'
    );
    return {
      isValid: false,
      score: 0,
      feedback: ['Password is required'],
      requirements: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      },
    };
  }

  const feedback: string[] = [];
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  let score = 0;

  if (requirements.length) {
    score++;
  } else {
    feedback.push('Password must be at least 8 characters long');
  }

  if (requirements.uppercase) {
    score++;
  } else {
    feedback.push('Password must contain at least one uppercase letter');
  }

  if (requirements.lowercase) {
    score++;
  } else {
    feedback.push('Password must contain at least one lowercase letter');
  }

  if (requirements.number) {
    score++;
  } else {
    feedback.push('Password must contain at least one number');
  }

  if (requirements.special) {
    score++;
  } else {
    feedback.push(
      'Password should contain at least one special character (@$!%*?&)'
    );
  }

  const isValid = score >= 4; // Require at least 4 out of 5 criteria

  return {
    isValid,
    score,
    feedback,
    requirements,
  };
}

/**
 * Gets password strength label based on score.
 *
 * @param score - Password strength score (0-4).
 * @returns String label for password strength.
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Good';
    case 4:
    case 5:
      return 'Strong';
    default:
      return 'Unknown';
  }
}

// ============================================================================
// Profile & Name Validation
// ============================================================================

/**
 * Validates if a string contains special characters that are not allowed in usernames, firstnames, or lastnames.
 * Also checks for phone number patterns.
 *
 * @param value - The string to validate.
 * @returns True if valid (no special characters or phone patterns), false otherwise.
 */
export function validateProfileField(value: string): boolean {
  // Allow letters, numbers, spaces, hyphens, and apostrophes
  const allowedPattern = /^[a-zA-Z0-9\s\-']+$/;

  // Check for phone number patterns
  const phonePattern =
    /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$|^[\+]?[1-9][\d\s\-\(\)]{6,}$/;

  return allowedPattern.test(value) && !phonePattern.test(value.trim());
}

/**
 * Validates username rules:
 *  - Must pass profile field validation (no disallowed characters/phone patterns)
 *  - Must not resemble an email address
 * @param {string} value - The username to validate.
 * @returns {boolean} True if the username passes all rules, false otherwise.
 */
export function validateUsername(value: string): boolean {
  if (!value) return false;
  if (!validateProfileField(value)) {
    return false;
  }
  if (containsEmailPattern(value)) {
    return false;
  }
  return true;
}

/**
 * Validates if a string contains only letters, spaces, hyphens and apostrophes (for names).
 * Also checks for phone number patterns.
 *
 * @param value - The string to validate.
 * @returns True if valid (only letters, spaces, hyphens, apostrophes, no phone patterns), false otherwise.
 */
export function validateNameField(value: string): boolean {
  if (!value) return false;
  // Allow letters, spaces, hyphens, and apostrophes
  const allowedPattern = /^[a-zA-Z\s\-']+$/;

  // Check for phone number patterns (avoid names that look like phone numbers)
  const phonePattern =
    /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$|^[\+]?[1-9][\d\s\-\(\)]{6,}$/;

  const trimmed = value.trim();
  return (
    trimmed.length >= 2 &&
    allowedPattern.test(trimmed) &&
    !phonePattern.test(trimmed)
  );
}

function validateGender(
  value: string | null | undefined
): value is AllowedGender {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (ALLOWED_GENDERS as readonly string[]).includes(normalized);
}

/**
 * Validates an optional gender field, returning true when empty.
 * @param {string | null | undefined} value - The gender value to validate.
 * @returns {boolean} True if the value is empty (optional) or a valid gender, false otherwise.
 */
export function validateOptionalGender(
  value: string | null | undefined
): boolean {
  if (!value) return true;
  return validateGender(value);
}

/**
 * Validates an optional alphabetic field, returning true when empty.
 * Falls back to validateNameField for non-empty values.
 * @param {string | null | undefined} value - The field value to validate.
 * @returns {boolean} True if empty (optional) or passes alphabetic validation.
 */
export function validateAlphabeticField(
  value: string | null | undefined
): boolean {
  if (!value) return true;
  return validateNameField(value);
}

/**
 * Validates street address - allows letters, numbers, spaces, commas, and full stops
 * @param value - The street address to validate
 * @returns True if valid, false otherwise
 */
export function validateStreetAddress(
  value: string | null | undefined
): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  // Allow letters, numbers, spaces, commas, and full stops
  const allowedPattern = /^[a-zA-Z0-9\s,\.]+$/;
  return allowedPattern.test(trimmed);
}

/**
 * Validates whether a value can be parsed into a valid date.
 * Returns true for empty/null/undefined values (treating them as optional).
 * @param {string | Date | null | undefined} value - The value to check.
 * @returns {boolean} True if empty or a valid date, false if parsing fails.
 */
export function isValidDateInput(
  value: string | Date | null | undefined
): boolean {
  if (!value) return true;
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime());
}

// ============================================================================
// Phone Validation
// ============================================================================

/**
 * Checks if a string contains phone number patterns.
 *
 * @param value - The string to check.
 * @returns True if contains phone number patterns, false otherwise.
 */
export function containsPhonePattern(value: string): boolean {
  // Various phone number patterns
  const phonePatterns = [
    /^[\+]?[1-9][\d]{0,15}$/, // International format: +1234567890
    /^[\+]?[(]?[\d\s\-\(\)]{7,}$/, // With parentheses: (123) 456-7890
    /^[\+]?[1-9][\d\s\-\(\)]{6,}$/, // With dashes: 123-456-7890
    /^\d{3}[\s\-]?\d{3}[\s\-]?\d{4}$/, // US format: 123-456-7890 or 123 456 7890
    /^\(\d{3}\)\s?\d{3}[\s\-]?\d{4}$/, // US format with parentheses: (123) 456-7890
    /^\d{10}$/, // 10 digits: 1234567890
    /^\d{11}$/, // 11 digits: 11234567890
  ];

  const trimmedValue = value.trim();
  return phonePatterns.some(pattern => pattern.test(trimmedValue));
}

/**
 * Validates phone numbers for required profile fields.
 *
 * Accepted formats (non-exhaustive):
 *  - +1 868 000-0000
 *  - +18680000000
 *  - +1 868 0000000
 *  - 18680000000
 *  - (868) 000-0000
 *  - 868-000-0000
 *
 * Rules:
 *  - Only digits, spaces, +, (, ), - allowed
 *  - + may appear at most once and only at the very start
 *  - ( may appear at most once
 *  - ) may appear at most once
 *  - - may appear at most once
 *  - Total digit count must be 7–15
 */
export function validatePhoneNumber(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Only allow: digits, spaces, +, (, ), -
  if (/[^0-9\s+()\-]/.test(trimmed)) return false;

  // + only at the very start
  if ((trimmed.match(/\+/g) || []).length > 1) return false;
  if (trimmed.includes('+') && trimmed.indexOf('+') !== 0) return false;

  // At most 1 open paren, 1 close paren
  if ((trimmed.match(/\(/g) || []).length > 1) return false;
  if ((trimmed.match(/\)/g) || []).length > 1) return false;

  // At most 1 dash
  if ((trimmed.match(/-/g) || []).length > 1) return false;

  // Digit count check
  const digitCount = trimmed.replace(/\D/g, '').length;
  return digitCount >= 7 && digitCount <= 15;
}

/**
 * Normalizes a phone number by stripping everything except digits.
 * @param {string} value - The phone number string to normalize.
 * @returns {string} The phone number containing only digits.
 */
export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

// ============================================================================
// Collection Report Validation
// ============================================================================

/**
 * Validates a CreateCollectionReportPayload object (backend).
 * @param payload - The payload to validate.
 * @returns { isValid: boolean, errors: string[] }
 */
export function validateCollectionReportPayload(
  payload: CreateCollectionReportPayload
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!payload.collector) errors.push('Collector ID is required.');
  if (!payload.locationName) errors.push('Location name is required.');
  if (!payload.locationReportId) errors.push('Location report ID is required.');
  if (!payload.location) errors.push('Location ID is required.');
  if (!payload.timestamp) errors.push('Timestamp is required.');
  // Only validate variance if it's provided (optional field)
  if (
    payload.variance !== undefined &&
    payload.variance !== null &&
    (typeof payload.variance !== 'number' || isNaN(payload.variance))
  )
    errors.push('Variance must be a number if provided.');
  // Only validate previous balance if it's provided (optional field)
  if (
    payload.previousBalance !== undefined &&
    payload.previousBalance !== null &&
    (typeof payload.previousBalance !== 'number' ||
      isNaN(payload.previousBalance))
  )
    errors.push('Previous balance must be a number if provided.');
  if (
    typeof payload.amountToCollect !== 'number' ||
    isNaN(payload.amountToCollect)
  )
    errors.push('Amount to collect is required and must be a number.');
  // Only validate collected amount if it's provided (optional field)
  if (
    payload.amountCollected !== undefined &&
    payload.amountCollected !== null &&
    (typeof payload.amountCollected !== 'number' ||
      isNaN(payload.amountCollected))
  )
    errors.push('Collected amount must be a number if provided.');
  // Only validate taxes if it's provided (optional field)
  if (
    payload.taxes !== undefined &&
    payload.taxes !== null &&
    (typeof payload.taxes !== 'number' || isNaN(payload.taxes))
  )
    errors.push('Taxes must be a number if provided.');
  // Only validate advance if it's provided (optional field)
  if (
    payload.advance !== undefined &&
    payload.advance !== null &&
    (typeof payload.advance !== 'number' || isNaN(payload.advance))
  )
    errors.push('Advance must be a number if provided.');
  if (
    typeof payload.balanceCorrection !== 'number' ||
    isNaN(payload.balanceCorrection)
  )
    errors.push('Balance correction is required and must be a number.');
  if (
    payload.balanceCorrectionReas &&
    payload.balanceCorrectionReas.trim() === ''
  )
    errors.push('Balance correction reason cannot be empty if provided.');
  if (payload.varianceReason && payload.varianceReason.trim() === '')
    errors.push('Variance reason cannot be empty if provided.');
  if (
    payload.reasonShortagePayment &&
    payload.reasonShortagePayment.trim() === ''
  )
    errors.push('Reason for shortage payment cannot be empty if provided.');
  if (errors.length > 0) {
    console.group('⚠️ Collection Report Validation Errors');
    console.error('Validation failed with the following issues:', errors);
    console.log('Payload Field Types:', {
      variance: { value: payload.variance, type: typeof payload.variance },
      previousBalance: {
        value: payload.previousBalance,
        type: typeof payload.previousBalance,
      },
      amountToCollect: {
        value: payload.amountToCollect,
        type: typeof payload.amountToCollect,
      },
      amountCollected: {
        value: payload.amountCollected,
        type: typeof payload.amountCollected,
      },
      taxes: { value: payload.taxes, type: typeof payload.taxes },
      advance: { value: payload.advance, type: typeof payload.advance },
      balanceCorrection: {
        value: payload.balanceCorrection,
        type: typeof payload.balanceCorrection,
      },
    });
    console.groupEnd();
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates collection report data to ensure it's valid and complete.
 * @param data - The collection report data to validate.
 * @returns True if the data is valid, false otherwise.
 */
export function validateCollectionReportData(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const report = data as {
    reportId?: unknown;
    locationName?: unknown;
    collectionDate?: unknown;
    machineMetrics?: unknown;
    locationMetrics?: unknown;
  };

  // Check for essential fields that indicate a valid collection report
  // Note: API returns transformed data with different field names than database
  return !!(
    report.reportId &&
    report.locationName &&
    report.collectionDate &&
    Array.isArray(report.machineMetrics) &&
    report.locationMetrics &&
    typeof report.locationMetrics === 'object'
  );
}
