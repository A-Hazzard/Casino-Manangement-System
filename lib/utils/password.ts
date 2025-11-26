/**
 * Password Utilities
 *
 * Utility functions for password hashing and comparison.
 *
 * Features:
 * - Password hashing with bcrypt
 * - Password comparison
 * - Secure password handling
 */

import bcrypt from 'bcryptjs';

// ============================================================================
// Password Hashing Functions
// ============================================================================
/**
 * Hashes a password using bcryptjs.
 * @param password - The plain text password to hash.
 * @returns Promise resolving to the hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// ============================================================================
// Password Comparison Functions
// ============================================================================
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
