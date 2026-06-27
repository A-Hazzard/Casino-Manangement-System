/**
 * Member & Profile Field Validation
 *
 * Validation utilities for member/profile fields: names, usernames, phone
 * numbers, addresses, gender, and date inputs.
 *
 * @module lib/utils/validation/members
 */

// ============================================================================
// External Dependencies
// ============================================================================

import { containsEmailPattern } from './email';

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_GENDERS = ['male', 'female', 'other'] as const;
type AllowedGender = (typeof ALLOWED_GENDERS)[number];

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
  const allowedPattern = /^[a-zA-Z0-9\s\-']+$/;

  const phonePattern =
    /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$|^[\+]?[1-9][\d\s\-\(\)]{6,}$/;

  return allowedPattern.test(value) && !phonePattern.test(value.trim());
}

/**
 * Validates username rules.
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
  const allowedPattern = /^[a-zA-Z\s\-']+$/;

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
  const phonePatterns = [
    /^[\+]?[1-9][\d]{0,15}$/,
    /^[\+]?[(]?[\d\s\-\(\)]{7,}$/,
    /^[\+]?[1-9][\d\s\-\(\)]{6,}$/,
    /^\d{3}[\s\-]?\d{3}[\s\-]?\d{4}$/,
    /^\(\d{3}\)\s?\d{3}[\s\-]?\d{4}$/,
    /^\d{10}$/,
    /^\d{11}$/,
  ];

  const trimmedValue = value.trim();
  return phonePatterns.some(pattern => pattern.test(trimmedValue));
}

/**
 * Validates phone numbers for required profile fields.
 *
 * @param value - The phone number string to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePhoneNumber(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (/[^0-9\s+()\-]/.test(trimmed)) return false;

  if ((trimmed.match(/\+/g) || []).length > 1) return false;
  if (trimmed.includes('+') && trimmed.indexOf('+') !== 0) return false;

  if ((trimmed.match(/\(/g) || []).length > 1) return false;
  if ((trimmed.match(/\)/g) || []).length > 1) return false;

  if ((trimmed.match(/-/g) || []).length > 1) return false;

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
