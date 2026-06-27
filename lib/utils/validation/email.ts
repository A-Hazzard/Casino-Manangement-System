/**
 * Email Validation
 *
 * Email format, pattern, and placeholder detection utilities.
 *
 * @module lib/utils/validation/email
 */

// ============================================================================
// Constants
// ============================================================================

const EMAIL_REGEX = /\S+@\S+\.\S+/;

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Validates if a string is a valid email address.
 *
 * @param emailAddress - The email address to validate.
 * @returns True if valid, false otherwise.
 */
export function validateEmail(
  emailAddress: string | undefined | null
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
    /^[a-z]+\d*@example\.(com|org|net|test)$/i,
  ];

  return placeholderPatterns.some(pattern => pattern.test(normalized));
}
