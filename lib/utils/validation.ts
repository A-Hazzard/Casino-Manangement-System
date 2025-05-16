/**
 * Validates if a string is a valid email address.
 *
 * @param email - The email address to validate.
 * @returns True if valid, false otherwise.
 */
export function validateEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

/**
 * Validates if a password is at least 6 characters.
 *
 * @param password - The password to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePassword(password: string): boolean {
  return password.length >= 6;
}
