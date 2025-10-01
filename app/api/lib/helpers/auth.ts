import { getUserByEmail, getUserByUsername } from "./users";
import { sendEmail } from "../../lib/utils/email";
import { UserAuthPayload } from "@/shared/types";
import { comparePassword } from "../utils/validation";
import type { AuthResult } from "@/shared/types";
import {
  generateAccessToken,
  generateRefreshToken,
  getCurrentDbConnectionString,
  loginRateLimiter,
  validatePasswordStrength,
} from "@/lib/utils/auth";
import { logActivity } from "./activityLogger";

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
  ipAddress: string = "unknown",
  userAgent: string = "unknown",
  rememberMe: boolean = false
): Promise<AuthResult> {
  try {
    // Rate limiting check
    if (!loginRateLimiter.isAllowed(ipAddress)) {
      const resetTime = loginRateLimiter.getResetTime(ipAddress);
      const remainingTime = resetTime
        ? Math.ceil((resetTime - Date.now()) / 1000 / 60)
        : 15;

      await logActivity({
        action: "login_blocked",
        details: `Rate limit exceeded for ${identifier} from ${ipAddress}`,
        ipAddress,
        userAgent,
      });

      return {
        success: false,
        message: `Too many login attempts. Please try again in ${remainingTime} minutes.`,
      };
    }

    // Input validation
    if (!identifier || !password) {
      return {
        success: false,
        message: "Email/username and password are required.",
      };
    }

    // Find user by email or username first
    const user = /\S+@\S+\.\S+/.test(identifier)
      ? await getUserByEmail(identifier)
      : await getUserByUsername(identifier);

    if (!user) {
      await logActivity({
        action: "login_failed",
        details: `User not found: ${identifier}`,
        ipAddress,
        userAgent,
      });
      return { success: false, message: "Invalid email/username or password." };
    }

    // Check if user is enabled
    if (!user.isEnabled) {
      await logActivity({
        action: "login_blocked",
        details: `Disabled user attempted login: ${identifier}`,
        ipAddress,
        userAgent,
      });
      return {
        success: false,
        message: "Account is disabled. Please contact support.",
      };
    }

    // Check if user is locked
    if (
      user.isLocked &&
      user.lockedUntil &&
      new Date(user.lockedUntil) > new Date()
    ) {
      await logActivity({
        action: "login_blocked",
        details: `Locked user attempted login: ${identifier}`,
        ipAddress,
        userAgent,
      });
      return {
        success: false,
        message: "Account is temporarily locked. Please try again later.",
      };
    }

    // Verify password first
    const isMatch = await comparePassword(password, user.password || "");
    if (!isMatch) {
      // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await user.updateOne({
          failedLoginAttempts: failedAttempts,
          isLocked: true,
          lockedUntil: lockedUntil,
        });

        await logActivity({
          action: "account_locked",
          details: `Account locked due to ${failedAttempts} failed login attempts: ${identifier}`,
          ipAddress,
          userAgent,
        });

        return {
          success: false,
          message:
            "Account locked due to multiple failed login attempts. Please try again in 30 minutes.",
        };
      } else {
        await user.updateOne({ failedLoginAttempts: failedAttempts });
      }

      await logActivity({
        action: "login_failed",
        details: `Invalid password for: ${identifier}`,
        ipAddress,
        userAgent,
      });

      return { success: false, message: "Invalid email/username or password." };
    }

    // Reset failed login attempts and unlock account on successful login
    await user.updateOne({
      failedLoginAttempts: 0,
      isLocked: false,
      lockedUntil: null,
      lastLoginAt: new Date(),
      loginCount: (user.loginCount || 0) + 1,
    });

    // Clear rate limiting for successful login
    loginRateLimiter.clearAttempts(ipAddress);

    // Now check password strength after successful authentication
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      console.warn("Weak password detected:", passwordValidation.errors);
      // Return success but with a flag to prompt password update
      const userObject = user.toObject({ getters: true });
      
      const sessionId = userObject._id.toString();
      const accessToken = await generateAccessToken({
        _id: userObject._id.toString(),
        emailAddress: userObject.emailAddress,
        username: String(userObject.username || ""),
        isEnabled: userObject.isEnabled,
        sessionId: sessionId,
        dbContext: {
          connectionString: getCurrentDbConnectionString(),
          timestamp: Date.now(),
        },
      });

      const refreshToken = await generateRefreshToken(
        userObject._id.toString(),
        userObject._id.toString()
      );

      const userPayload: UserAuthPayload = {
        _id: userObject._id.toString(),
        emailAddress: userObject.emailAddress,
        username: String(userObject.username || ""),
        isEnabled: userObject.isEnabled,
        profile: userObject.profile || undefined,
        lastLoginAt: new Date(),
        loginCount: (Number(userObject.loginCount) || 0) + 1,
        isLocked: false,
        lockedUntil: undefined,
        failedLoginAttempts: 0,
        requiresPasswordUpdate: true, // Flag to indicate weak password
      };

      // Log successful login
      await logActivity({
        action: "login_success",
        details: `Successful login with weak password: ${identifier}`,
        ipAddress,
        userAgent,
        userId: user._id,
        username: user.emailAddress,
      });

      const expiresAt = new Date(
        Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
      ).toISOString();

      return {
        success: true,
        token: accessToken,
        refreshToken,
        user: userPayload,
        expiresAt,
        requiresPasswordUpdate: true,
      };
    }


    // Check for invalid profile fields (special characters)
    const { validateProfileField, validateNameField } = await import("@/lib/utils/validation");
    const invalidFields = {
      username: !validateProfileField(user.username || ""),
      firstName: !validateNameField(user.profile?.firstName || ""),
      lastName: !validateNameField(user.profile?.lastName || ""),
    };

    const hasInvalidFields = Object.values(invalidFields).some(Boolean);
    if (hasInvalidFields) {
      // Return success but with a flag to prompt profile update
      const userObject = user.toObject({ getters: true });
      
      const sessionId = userObject._id.toString();
      const accessToken = await generateAccessToken({
        _id: userObject._id.toString(),
        emailAddress: userObject.emailAddress,
        username: String(userObject.username || ""),
        isEnabled: userObject.isEnabled,
        sessionId: sessionId,
        dbContext: {
          connectionString: getCurrentDbConnectionString(),
          timestamp: Date.now(),
        },
      });

      const refreshToken = await generateRefreshToken(
        userObject._id.toString(),
        userObject._id.toString()
      );

      const userPayload: UserAuthPayload = {
        _id: userObject._id.toString(),
        emailAddress: userObject.emailAddress,
        username: String(userObject.username || ""),
        isEnabled: userObject.isEnabled,
        profile: userObject.profile || undefined,
        lastLoginAt: new Date(),
        loginCount: (Number(userObject.loginCount) || 0) + 1,
        isLocked: false,
        lockedUntil: undefined,
        failedLoginAttempts: 0,
        requiresProfileUpdate: true, // Flag to indicate invalid profile fields
        invalidProfileFields: invalidFields,
      };

      // Log successful login
      await logActivity({
        action: "login_success",
        details: `Successful login with invalid profile fields: ${identifier}`,
        ipAddress,
        userAgent,
        userId: user._id,
        username: user.emailAddress,
      });

      const expiresAt = new Date(
        Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
      ).toISOString();

      return {
        success: true,
        token: accessToken,
        refreshToken,
        user: userPayload,
        expiresAt,
        requiresProfileUpdate: true,
        invalidProfileFields: invalidFields,
      };
    }


    const userObject = user.toObject({ getters: true });


    // Generate tokens
    const sessionId = userObject._id.toString(); // Use user ID as session ID
    const accessToken = await generateAccessToken({
      _id: userObject._id.toString(),
      emailAddress: userObject.emailAddress,
      username: String(userObject.username || ""),
      isEnabled: userObject.isEnabled,
      sessionId: sessionId,
      dbContext: {
        connectionString: getCurrentDbConnectionString(),
        timestamp: Date.now(),
      },
    });

    const refreshToken = await generateRefreshToken(
      userObject._id.toString(),
      userObject._id.toString() // Using user ID as session ID for simplicity
    );

    const userPayload: UserAuthPayload = {
      _id: userObject._id.toString(),
      emailAddress: userObject.emailAddress,
      username: String(userObject.username || ""),
      isEnabled: userObject.isEnabled,
      profile: userObject.profile || undefined,
      lastLoginAt: new Date(),
      loginCount: (Number(userObject.loginCount) || 0) + 1,
      isLocked: false,
      lockedUntil: undefined,
      failedLoginAttempts: 0,
    };

    // Log successful login
    await logActivity({
      action: "login_success",
      details: `Successful login: ${identifier}`,
      ipAddress,
      userAgent,
      userId: user._id,
      username: user.emailAddress,
    });

    const expiresAt = new Date(
      Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
    ).toISOString();

    return {
      success: true,
      token: accessToken,
      refreshToken,
      user: userPayload,
      expiresAt,
    };
  } catch (error) {
    console.error("Authentication error:", error);

    await logActivity({
      action: "login_error",
      details: `Authentication error for ${identifier}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      ipAddress,
      userAgent,
    });

    return {
      success: false,
      message: "An error occurred during authentication. Please try again.",
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
    const { verifyRefreshToken } = await import("@/lib/utils/auth");
    const payload = await verifyRefreshToken(refreshToken);

    if (!payload || payload.type !== "refresh") {
      return { success: false, message: "Invalid refresh token." };
    }

    // Get user from database
    const user = await getUserByEmail(payload.userId);
    if (!user || !user.isEnabled) {
      return { success: false, message: "User not found or disabled." };
    }

    // Generate new access token
    const userObject = user.toObject({ getters: true });

    const sessionId = userObject._id.toString();
    const accessToken = await generateAccessToken({
      _id: userObject._id.toString(),
      emailAddress: userObject.emailAddress,
      username: String(userObject.username || ""),
      isEnabled: userObject.isEnabled,
      sessionId: sessionId,
      dbContext: {
        connectionString: getCurrentDbConnectionString(),
        timestamp: Date.now(),
      },
    });

    return { success: true, token: accessToken };
  } catch (error) {
    console.error("Token refresh error:", error);
    return { success: false, message: "Token refresh failed." };
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
        message: "No account found with this email address.",
      };
    }

    // Generate reset token (in a real app, you'd store this in the database with expiration)
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Store reset token in user record (you'd want to add this field to your user model)
    // await user.updateOne({ resetToken, resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) });

    const resetUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/reset-password?token=${resetToken}`;

    await sendEmail(
      email,
      "Password Reset Request",
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
      message: "Password reset email sent successfully.",
    };
  } catch (error) {
    console.error("Password reset email error:", error);
    return { success: false, message: "Failed to send password reset email." };
  }
}
