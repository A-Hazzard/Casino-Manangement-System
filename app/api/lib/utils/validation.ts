import { UserDocument } from "@/app/api/lib/types/auth";

/**
 * Validates if a string is a valid email address.
 *
 * @param emailAddress - The email address to validate.
 * @returns True if valid, false otherwise.
 */
export function validateEmail(
  emailAddress: UserDocument["emailAddress"]
): boolean {
  return /\S+@\S+\.\S+/.test(emailAddress);
}

/**
 * Validates if a password is at least 6 characters.
 *
 * @param password - The password to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePassword(password: UserDocument["password"]): boolean {
  return password.length >= 6;
}
