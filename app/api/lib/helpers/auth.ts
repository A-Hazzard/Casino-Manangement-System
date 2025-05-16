import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getUserByEmail } from "./users";
import { sendEmail } from "../../lib/utils/email";
import { UserAuthPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

/**
 * Authenticates a user by email and password, returning a JWT if successful.
 *
 * @param email - The user's email address.
 * @param password - The user's password.
 * @returns Promise resolving to an object with success, token, and user payload or error message.
 */
export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) return { success: false, message: "User not found." };

  const isMatch = await bcrypt.compare(password, user.password || "");
  if (!isMatch) return { success: false, message: "Incorrect password." };

  const userObject = user.toObject({ getters: true });

  const jwtPayload = {
    _id: userObject._id.toString(),
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
    isEnabled: userObject.isEnabled,
    roles: userObject.roles || [],
    permissions: userObject.permissions || [],
    resourcePermissions: userObject.resourcePermissions || {},
  };

  return { success: true, token, user: userPayload };
}

/**
 * Sends a password reset email to the user.
 *
 * @param email - The user's email address.
 * @returns Promise resolving to an object indicating success or failure, and an optional message.
 */
export async function sendResetPasswordEmail(email: string) {
  const user: UserAuthPayload | null = await getUserByEmail(email);
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
