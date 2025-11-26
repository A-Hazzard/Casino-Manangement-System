/**
 * Authentication Helper Functions
 *
 * Provides helper functions for user authentication, including credential validation,
 * JWT token generation, and password reset email functionality. It handles both
 * email and username-based authentication and integrates with the JWT signing system.
 *
 * Features:
 * - Validates user credentials (email or username) and generates JWT tokens.
 * - Sends password reset emails with short-lived tokens.
 * - Supports database context in JWT payloads for multi-tenant systems.
 */

import { SignJWT } from 'jose';
import { getUserByEmail, getUserByUsername } from './users';
import { sendEmail } from '../../lib/utils/email';
import type { UserAuthPayload } from '@/shared/types';
import { comparePassword } from '../utils/password';
import type { AuthResult } from '@/shared/types';
import { getCurrentDbConnectionString, getJwtSecret } from '@/lib/utils/auth';

// ============================================================================
// User Authentication
// ============================================================================

/**
 * Validates user credentials and generates a JWT token on success.
 *
 * @param email - User email address
 * @param password - Plain text password
 * @returns Authentication result containing token and user payload
 */
export async function authenticateUser(
  identifier: string,
  password: string
): Promise<AuthResult> {
  // Accept either email or username
  const user = /\S+@\S+\.\S+/.test(identifier)
    ? await getUserByEmail(identifier)
    : await getUserByUsername(identifier);
  if (!user) return { success: false, message: 'User not found.' };

  const isMatch = await comparePassword(password, user.password || '');
  if (!isMatch) return { success: false, message: 'Incorrect password.' };

  const userObject = user.toObject({ getters: true });

  const jwtPayload = {
    _id: userObject._id.toString(),
    emailAddress: userObject.emailAddress,
    username: String(userObject.username || ''),
    isEnabled: userObject.isEnabled,
    roles: userObject.roles || [],
    permissions: userObject.permissions || [],
  };

  const token = await new SignJWT({
    ...jwtPayload,
    dbContext: {
      connectionString: getCurrentDbConnectionString(),
      timestamp: Date.now(),
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('48h')
    .sign(new TextEncoder().encode(getJwtSecret()));

  const userPayload: UserAuthPayload = {
    _id: userObject._id.toString(),
    emailAddress: userObject.emailAddress,
    username: String(userObject.username || ''),
    isEnabled: userObject.isEnabled,
    profile: userObject.profile || undefined,
  };

  return { success: true, token, user: userPayload };
}

// ============================================================================
// Password Reset
// ============================================================================

/**
 * Sends a password reset email with a short-lived token.
 *
 * @param email - User email address
 * @returns Result indicating if the email was sent successfully
 */
export async function sendResetPasswordEmail(
  email: string
): Promise<AuthResult> {
  const user = await getUserByEmail(email);
  if (!user) {
    return { success: false, message: 'User not found.' };
  }

  const resetToken = await new SignJWT({ userId: user._id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(getJwtSecret()));

  const resetUrl = `/reset-password?token=${resetToken}`;

  const subject = 'Password Reset Instructions';
  const text = `Reset your password using the following link: ${resetUrl}`;
  const html = `<p>Please click <a href="${resetUrl}">here</a> to reset your password.</p>`;

  const emailResult = await sendEmail(email, subject, text, html);
  if (emailResult.success) {
    return { success: true };
  } else {
    return { success: false, message: 'Failed to send email.' };
  }
}
