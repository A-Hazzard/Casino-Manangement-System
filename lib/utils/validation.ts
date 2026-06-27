/**
 * Validation Utilities - Barrel Exports
 *
 * Re-exports all validation functions from domain-specific sub-modules.
 *
 * @module lib/utils/validation
 */

export {
  validateEmail,
  containsEmailPattern,
  isPlaceholderEmail,
} from './validation/email';

export {
  validatePassword,
  validatePasswordStrength,
  getPasswordStrengthLabel,
  type PasswordStrengthResult,
} from './validation/password';

export {
  validateProfileField,
  validateUsername,
  validateNameField,
  validateOptionalGender,
  validateAlphabeticField,
  validateStreetAddress,
  isValidDateInput,
  containsPhonePattern,
  validatePhoneNumber,
  normalizePhoneNumber,
} from './validation/members';

export {
  validateCollectionReportPayload,
  validateCollectionReportData,
} from './validation/collectionReports';
