import { SignJWT } from "jose";
import { getUserByEmail, getUserByUsername } from "./users";
import { sendEmail } from "../../lib/utils/email";
import { UserAuthPayload } from "@/lib/types/auth";
import { comparePassword } from "../utils/validation";
import type { AuthResult } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

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
  if (!user) return { success: false, message: "User not found." };

  const isMatch = await comparePassword(password, user.password || "");
  if (!isMatch) return { success: false, message: "Incorrect password." };

  const userObject = user.toObject({ getters: true });

  const jwtPayload = {
    _id: userObject._id.toString(),
    emailAddress: userObject.emailAddress,
    username: String(userObject.username || ""),
    isEnabled: userObject.isEnabled,
    roles: userObject.roles || [],
    permissions: userObject.permissions || [],
  };

  const token = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("48h")
    .sign(new TextEncoder().encode(JWT_SECRET));

  const userPayload: UserAuthPayload = {
    _id: userObject._id.toString(),
    emailAddress: userObject.emailAddress,
    username: String(userObject.username || ""),
    isEnabled: userObject.isEnabled,
    roles: userObject.roles || [],
    permissions: userObject.permissions || [],
    resourcePermissions:
      (userObject.resourcePermissions as {
        [key: string]: {
          entity: string;
          resources: string[];
        };
      }) || {},
    profile: userObject.profile || undefined,
  };

  return { success: true, token, user: userPayload };
}

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
    return { success: false, message: "User not found." };
  }

  const resetToken = await new SignJWT({ userId: user._id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(JWT_SECRET));

  const resetUrl = `/reset-password?token=${resetToken}`;

  const subject = "Password Reset Instructions";
  const text = `Reset your password using the following link: ${resetUrl}`;
  const html = `<p>Please click <a href="${resetUrl}">here</a> to reset your password.</p>`;

  const emailResult = await sendEmail(email, subject, text, html);
  if (emailResult.success) {
    return { success: true };
  } else {
    return { success: false, message: "Failed to send email." };
  }
}

/**
 * Logs out a user by clearing their authentication token.
 * This function is used on the client side to handle logout.
 *
 * @returns void
 */
export function logoutUser(): void {
  // Clear any stored tokens or session data
  if (typeof window !== 'undefined') {
    // Clear localStorage/sessionStorage if needed
    localStorage.removeItem('token');
    sessionStorage.clear();
    
    // Redirect to login page
    window.location.href = '/login';
  }
}