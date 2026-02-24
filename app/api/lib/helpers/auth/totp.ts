import { generateSecret, generateURI, verifySync } from 'otplib';

/**
 * TOTP Helper Functions
 * 
 * Provides utilities for generating secrets, verifying codes, 
 * and creating authentication URIs for Google Authenticator.
 * Uses otplib v13 functional API.
 */

/**
 * Generate a new TOTP secret for a user.
 * @returns A base32 encoded secret string.
 */
export function generateTOTPSecret(): string {
  return generateSecret();
}

/**
 * Verify a TOTP code against a secret.
 * @param token The code entered by the user.
 * @param secret The user's stored secret.
 * @returns boolean indicating if the token is valid.
 */
export function verifyTOTPCode(token: string, secret: string): boolean {
  try {
    const result = verifySync({
      token,
      secret,
      epochTolerance: 60, // Allow 60 seconds (2 steps) before/after to handle time drift
    });
    // In otplib v13, verifySync returns a result object { valid: boolean, delta?: number }
    if (!result?.valid) {
      console.warn(`[TOTP] Verification FAILED. Token: ${token}, Secret: ${secret.substring(0, 4)}..., Result:`, result);
    } else {
      console.log(`[TOTP] Verification SUCCESS. Delta: ${result.delta}`);
    }
    return result?.valid === true;
  } catch (err) {
    console.error('TOTP Verification Error:', err);
    return false;
  }
}

/**
 * Generate a keyuri for QR code generation.
 * @param user The username or email of the user.
 * @param issuer The name of the application (Evolution One).
 * @param secret The user's secret.
 */
export function generateOTPAuthURI(user: string, issuer: string, secret: string): string {
  return generateURI({
    secret,
    label: user,
    issuer,
  });
}
