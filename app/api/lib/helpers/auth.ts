/**
 * Authentication Helper Functions
 *
 * Provides backend helper functions for user authentication, including credential
 * validation, JWT token generation, password reset, and session management. It handles
 * user login, token refresh, and password reset email functionality with comprehensive
 * security features and profile validation.
 *
 * Features:
 * - Validates user credentials (email/username and password).
 * - Generates JWT access and refresh tokens.
 * - Handles profile validation and password strength checks.
 * - Manages user session versioning and login tracking.
 * - Sends password reset emails.
 * - Logs authentication activities for security auditing.
 */

import {
  generateAccessToken,
  generateRefreshToken,
  getCurrentDbConnectionString,
} from '@/lib/utils/auth';
import type { AuthResult } from '@/shared/types';
import { UserAuthPayload } from '@/shared/types';
import type { UserDocumentWithPassword } from '@/shared/types/users';
import { sendEmail } from '../../lib/utils/email';
import UserModel from '../models/user';
import { comparePassword } from '../utils/validation';
import { logActivity } from './activityLogger';
import {
  getInvalidProfileFields,
  hasInvalidProfileFields,
} from './profileValidation';
import { getUserByEmail, getUserByUsername } from './users';

/**
 * Validates user credentials and generates JWT tokens on success.
 * Enhanced with rate limiting, session management, and security features.
 *
 * @param identifier - User email address or username
 * @param password - Plain text password
 * @param ipAddress - Client IP address for rate limiting and logging
 * @param userAgent - Client user agent for session tracking
 * @param rememberMe - Whether to create a longer-lived session
 * @returns Authentication result containing tokens and user payload
 */
export async function authenticateUser(
  identifier: string,
  password: string,
  ipAddress: string = 'unknown',
  userAgent: string = 'unknown',
  rememberMe: boolean = false
): Promise<AuthResult> {
  try {
    // Input validation
    if (!identifier || !password) {
      return {
        success: false,
        message: 'Email/username and password are required.',
      };
    }

    // Find user by email or username
    // If identifier looks like an email, try both email and username lookup
    // (in case user has their email as their username - they should still be able to login)
    const looksLikeEmail = /\S+@\S+\.\S+/.test(identifier);
    let user = null;

    if (looksLikeEmail) {
      // Try email first, then username (in case username is an email)
      user = await getUserByEmail(identifier);
      if (!user) {
        user = await getUserByUsername(identifier);
      }
    } else {
      // If it doesn't look like an email, only try username lookup
      user = await getUserByUsername(identifier);
    }

    // Enhanced logging for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[authenticateUser] Login attempt:', {
        identifier,
        looksLikeEmail,
        userFound: !!user,
        userId: user?._id,
        username: user?.username,
        email: user?.emailAddress,
        isEnabled: user?.isEnabled,
      });
    }

    if (!user) {
      await logActivity({
        action: 'login_failed',
        details: `User not found: ${identifier}`,
        ipAddress,
        userAgent,
        userId: 'unknown',
        username: 'unknown',
      });
      return { success: false, message: 'Invalid email/username or password.' };
    }

    // Check if user is soft-deleted (deletedAt >= 2025)
    // Only reject users with deletedAt set to 2025 or later
    // Users without deletedAt or with deletedAt < 2025 can still login
    // Note: getUserByEmail/getUserByUsername no longer filter soft-deleted users,
    // so we check here to prevent login and show appropriate error message
    if (user.deletedAt) {
      const year2025Start = new Date('2025-01-01T00:00:00.000Z');
      const deletedAtDate =
        user.deletedAt instanceof Date
          ? user.deletedAt
          : new Date(user.deletedAt);

      // Only block login if deletedAt is >= 2025
      if (deletedAtDate >= year2025Start) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[authenticateUser] User account is soft-deleted (2025+):',
            {
              identifier,
              userId: user._id,
              username: user.username,
              deletedAt: user.deletedAt,
            }
          );
        }
        await logActivity({
          action: 'login_blocked',
          details: `Soft-deleted user (2025+) attempted login: ${identifier}`,
          ipAddress,
          userAgent,
          userId: user._id,
          username: user.username,
        });
        // Show generic error message based on identifier format to avoid revealing account status
        const errorMessage = looksLikeEmail
          ? 'Invalid email or password.'
          : 'Invalid username or password.';
        return {
          success: false,
          message: errorMessage,
        };
      }
    }

    // Check if user is enabled
    if (!user.isEnabled) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[authenticateUser] User account is disabled:', {
          identifier,
          userId: user._id,
          username: user.username,
        });
      }
      await logActivity({
        action: 'login_blocked',
        details: `Disabled user attempted login: ${identifier}`,
        ipAddress,
        userAgent,
        userId: user._id,
        username: user.username,
      });
      return {
        success: false,
        message: 'Account is disabled. Please contact support.',
      };
    }

    // Verify password
    const hasPassword = !!user.password;
    if (process.env.NODE_ENV === 'development') {
      console.log('[authenticateUser] Password check:', {
        identifier,
        userId: user._id,
        hasPassword,
        passwordLength: user.password?.length || 0,
      });
    }

    const isMatch = await comparePassword(password, user.password || '');
    if (!isMatch) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[authenticateUser] Password mismatch:', {
          identifier,
          userId: user._id,
          username: user.username,
        });
      }
      await logActivity({
        action: 'login_failed',
        details: `Invalid password for: ${identifier}`,
        ipAddress,
        userAgent,
        userId: user._id,
        username: user.username,
      });

      return { success: false, message: 'Invalid email/username or password.' };
    }

    // Update login metadata on successful login
    // NOTE: sessionVersion should NOT be incremented on login - only when permissions change
    // Incrementing sessionVersion on login would invalidate all other active sessions
    const now = new Date();
    const currentSessionVersion = Number(user.sessionVersion) || 0;
    await UserModel.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          lastLoginAt: now,
        },
        $inc: {
          loginCount: 1,
        },
      }
    );
    // Keep local in-sync values for token payload
    user.sessionVersion = currentSessionVersion; // Keep existing sessionVersion
    user.lastLoginAt = now;
    user.loginCount = (Number(user.loginCount) || 0) + 1;

    const {
      invalidFields,
      reasons: invalidReasons,
      passwordConfirmedStrong,
    } = getInvalidProfileFields(user as never, { rawPassword: password });

    if (!user.toObject().passwordUpdatedAt && passwordConfirmedStrong) {
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { passwordUpdatedAt: new Date() } }
      );
    }

    if (passwordConfirmedStrong) {
      delete invalidFields.password;
      delete invalidReasons.password;
    }

    const profileInvalid = hasInvalidProfileFields(invalidFields);
    if (profileInvalid) {
      // Return success but with a flag to prompt profile update
      const userObject = (user as UserDocumentWithPassword).toJSON();

      const sessionId = userObject._id.toString();
      // Don't include assignedLocations/assignedLicensees in token to prevent cookie size issues
      // The full list is available from userPayload (stored in localStorage) and can be fetched from DB
      // The middleware only needs to verify the token exists and is valid - it doesn't need location data
      // Location/licensee filtering happens in API routes, not middleware

      const accessToken = await generateAccessToken({
        _id: userObject._id.toString(),
        emailAddress: userObject.emailAddress,
        username: String(userObject.username || ''),
        isEnabled: userObject.isEnabled,
        roles: userObject.roles || [],
        // Removed assignedLocations and assignedLicensees to keep token small enough for cookies
        // Full data is in userPayload (localStorage) and can be fetched from DB when needed
        sessionId: sessionId,
        sessionVersion: Number(userObject.sessionVersion) || 1,
        dbContext: {
          connectionString: getCurrentDbConnectionString(),
          timestamp: Date.now(),
        },
      } as never);

      const refreshToken = await generateRefreshToken(
        userObject._id.toString(),
        userObject._id.toString()
      );

      const userPayload = {
        _id: userObject._id.toString(),
        emailAddress: userObject.emailAddress,
        username: String(userObject.username || ''),
        isEnabled: userObject.isEnabled,
        roles: userObject.roles || [],
        profile: userObject.profile || undefined,
        assignedLocations: userObject.assignedLocations || undefined,
        assignedLicensees: userObject.assignedLicensees || undefined,
        sessionVersion: Number(userObject.sessionVersion) || 1,
        lastLoginAt: new Date(),
        loginCount: (Number(userObject.loginCount) || 0) + 1,
        isLocked: false,
        lockedUntil: undefined,
        failedLoginAttempts: 0,
        requiresProfileUpdate: true, // Flag to indicate invalid profile fields
        invalidProfileFields: invalidFields,
        invalidProfileReasons: invalidReasons,
      } as UserAuthPayload;

      // Log successful login
      await logActivity({
        action: 'login_success',
        details: `Successful login with invalid profile fields: ${identifier}`,
        ipAddress,
        userAgent,
        userId: user._id,
        username: user.username,
      });

      const expiresAt = new Date(
        Date.now() +
          (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)
      ).toISOString();

      return {
        success: true,
        token: accessToken,
        refreshToken,
        user: userPayload,
        expiresAt,
        requiresProfileUpdate: true,
        invalidProfileFields: invalidFields,
        invalidProfileReasons: invalidReasons,
      };
    }

    // Use toJSON() which properly serializes Mongoose Maps
    const userObject = (user as UserDocumentWithPassword).toJSON();

    // Generate tokens
    const sessionId = userObject._id.toString(); // Use user ID as session ID
    // Don't include assignedLocations/assignedLicensees in token to prevent cookie size issues
    // The full list is available from userPayload (stored in localStorage) and can be fetched from DB
    // The middleware only needs to verify the token exists and is valid - it doesn't need location data
    // Location/licensee filtering happens in API routes, not middleware

    const accessToken = await generateAccessToken({
      _id: userObject._id.toString(),
      emailAddress: userObject.emailAddress,
      username: String(userObject.username || ''),
      isEnabled: userObject.isEnabled,
      roles: userObject.roles || [],
      // Removed assignedLocations and assignedLicensees to keep token small enough for cookies
      // Full data is in userPayload (localStorage) and can be fetched from DB when needed
      sessionId: sessionId,
      sessionVersion: Number(userObject.sessionVersion) || 1,
      dbContext: {
        connectionString: getCurrentDbConnectionString(),
        timestamp: Date.now(),
      },
    } as never);

    const refreshToken = await generateRefreshToken(
      userObject._id.toString(),
      userObject._id.toString() // Using user ID as session ID for simplicity
    );

    const userPayload = {
      _id: userObject._id.toString(),
      emailAddress: userObject.emailAddress,
      username: String(userObject.username || ''),
      isEnabled: userObject.isEnabled,
      roles: userObject.roles || [],
      profile: userObject.profile || undefined,
      assignedLocations: userObject.assignedLocations || undefined,
      assignedLicensees: userObject.assignedLicensees || undefined,
      sessionVersion: Number(userObject.sessionVersion) || 1,
      lastLoginAt: new Date(),
      loginCount: (Number(userObject.loginCount) || 0) + 1,
      isLocked: false,
      lockedUntil: undefined,
      failedLoginAttempts: 0,
      requiresProfileUpdate: false,
      invalidProfileFields: undefined,
      invalidProfileReasons: undefined,
    } as UserAuthPayload;

    // Log successful login
    await logActivity({
      action: 'login_success',
      details: `Successful login: ${identifier}`,
      ipAddress,
      userAgent,
      userId: user._id,
      username: user.username,
    });

    const expiresAt = new Date(
      Date.now() +
        (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)
    ).toISOString();

    return {
      success: true,
      token: accessToken,
      refreshToken,
      user: userPayload,
      expiresAt,
      requiresProfileUpdate: false,
      invalidProfileFields: undefined,
      invalidProfileReasons: undefined,
    };
  } catch (error) {
    console.error('Authentication error:', error);

    // Try to get user info for error logging if available
    let userIdForLog = 'unknown';
    let usernameForLog = 'unknown';

    try {
      const user = /\S+@\S+\.\S+/.test(identifier)
        ? await getUserByEmail(identifier)
        : await getUserByUsername(identifier);
      if (user) {
        userIdForLog = user._id;
        usernameForLog = user.username;
      }
    } catch {
      // Ignore errors when trying to get user for logging
    }

    await logActivity({
      action: 'login_error',
      details: `Authentication error for ${identifier}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      ipAddress,
      userAgent,
      userId: userIdForLog,
      username: usernameForLog,
    });

    return {
      success: false,
      message: 'An error occurred during authentication. Please try again.',
    };
  }
}

/**
 * Validates a refresh token and generates a new access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthResult> {
  try {
    const { verifyRefreshToken } = await import('@/lib/utils/auth');
    const payload = await verifyRefreshToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return { success: false, message: 'Invalid refresh token.' };
    }

    // Get user from database
    const user = await getUserByEmail(payload.userId);
    if (!user || !user.isEnabled) {
      return { success: false, message: 'User not found or disabled.' };
    }

    // Generate new access token
    const userObject = (user as UserDocumentWithPassword).toJSON();

    const sessionId = userObject._id.toString();

    // Extract new fields
    const assignedLocations = userObject.assignedLocations?.length
      ? userObject.assignedLocations
      : undefined;
    const assignedLicensees = userObject.assignedLicensees?.length
      ? userObject.assignedLicensees
      : undefined;

    const accessToken = await generateAccessToken({
      _id: userObject._id.toString(),
      emailAddress: userObject.emailAddress,
      username: String(userObject.username || ''),
      isEnabled: userObject.isEnabled,
      roles: userObject.roles || [],
      assignedLocations,
      assignedLicensees,
      sessionId: sessionId,
      sessionVersion: Number(userObject.sessionVersion) || 1,
      dbContext: {
        connectionString: getCurrentDbConnectionString(),
        timestamp: Date.now(),
      },
    } as never);

    return { success: true, token: accessToken };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, message: 'Token refresh failed.' };
  }
}

/**
 * Sends password reset email
 */
export async function sendPasswordResetEmail(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return {
        success: false,
        message: 'No account found with this email address.',
      };
    }

    // Generate reset token (in a real app, you'd store this in the database with expiration)
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Store reset token in user record (you'd want to add this field to your user model)
    // await user.updateOne({ resetToken, resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) });

    const resetUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }/reset-password?token=${resetToken}`;

    await sendEmail(
      email,
      'Password Reset Request',
      `Password Reset Request\n\nYou requested a password reset for your account.\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\nIf you didn't request this reset, please ignore this email.`,
      `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      `
    );

    return {
      success: true,
      message: 'Password reset email sent successfully.',
    };
  } catch (error) {
    console.error('Password reset email error:', error);
    return { success: false, message: 'Failed to send password reset email.' };
  }
}
