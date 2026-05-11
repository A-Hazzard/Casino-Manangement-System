import { UserDocument } from '@/shared/types/auth';
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
  if (!emailAddress || typeof emailAddress !== 'string') {
    console.error(
      '[validateEmail] emailAddress is required and must be a string'
    );
    return false;
  }

  return /\S+@\S+\.\S+/.test(emailAddress);
}

/**
 * Hashes a password using bcryptjs.
 * @param password - The plain text password to hash.
 * @returns Promise resolving to the hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    console.error('[hashPassword] password is required and must be a string');
    throw new Error('Invalid password');
  }

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
  if (
    !password ||
    typeof password !== 'string' ||
    !hashedPassword ||
    typeof hashedPassword !== 'string'
  ) {
    console.error(
      '[comparePassword] password and hashedPassword are required and must be strings'
    );
    return false;
  }

  return await bcrypt.compare(password, hashedPassword);
}
