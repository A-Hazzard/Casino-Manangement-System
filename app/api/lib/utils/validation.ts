import { UserDocument } from '@/shared/types/auth';
import type { CreateCollectionReportPayload } from '@/lib/types/api';
import bcrypt from 'bcryptjs';

/**
 * Validates if a string is a valid email address.
 *
 * @param emailAddress - The email address to validate.
 * @returns True if valid, false otherwise.
 */
export function validateEmail(
  emailAddress: UserDocument['emailAddress']
): boolean {
  return /\S+@\S+\.\S+/.test(emailAddress);
}

/**
 * Validates if a password is at least 6 characters.
 *
 * @param password - The password to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePassword(password: UserDocument['password']): boolean {
  return password.length >= 6;
}

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
  if (!payload.collectorName) errors.push('Collector name is required.');
  if (!payload.locationName) errors.push('Location name is required.');
  if (!payload.locationReportId) errors.push('Location report ID is required.');
  if (!payload.location) errors.push('Location ID is required.');
  if (!payload.timestamp) errors.push('Timestamp is required.');
  if (typeof payload.variance !== 'number' || isNaN(payload.variance))
    errors.push('Variance is required and must be a number.');
  if (
    typeof payload.previousBalance !== 'number' ||
    isNaN(payload.previousBalance)
  )
    errors.push('Previous balance is required and must be a number.');
  if (
    typeof payload.amountToCollect !== 'number' ||
    isNaN(payload.amountToCollect)
  )
    errors.push('Amount to collect is required and must be a number.');
  if (
    typeof payload.amountCollected !== 'number' ||
    isNaN(payload.amountCollected)
  )
    errors.push('Collected amount is required and must be a number.');
  if (typeof payload.taxes !== 'number' || isNaN(payload.taxes))
    errors.push('Taxes is required and must be a number.');
  if (typeof payload.advance !== 'number' || isNaN(payload.advance))
    errors.push('Advance is required and must be a number.');
  if (
    typeof payload.balanceCorrection !== 'number' ||
    isNaN(payload.balanceCorrection)
  )
    errors.push('Balance correction is required and must be a number.');
  if (!payload.balanceCorrectionReas)
    errors.push('Balance correction reason is required.');
  if (!payload.varianceReason) errors.push('Variance reason is required.');
  if (!payload.reasonShortagePayment)
    errors.push('Reason for shortage payment is required.');
  return { isValid: errors.length === 0, errors };
}

/**
 * Hashes a password using bcryptjs.
 * @param password - The plain text password to hash.
 * @returns Promise resolving to the hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compares a plain text password to a hashed password.
 * @param password - The plain text password.
 * @param hashedPassword - The hashed password from the database.
 * @returns Promise resolving to true if match, false otherwise.
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}
