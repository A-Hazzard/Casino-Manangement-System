import User from "../models/user";
import { UserDocument } from "@/app/api/lib/types/auth";

/**
 * Finds a user by email address (case-insensitive).
 *
 * @param emailAddress - The email address to search for.
 * @returns Promise resolving to a UserDocument or null if not found.
 */
export async function getUserByEmail(
  emailAddress: string
): Promise<UserDocument | null> {
  return User.findOne({
    emailAddress: { $regex: new RegExp(`^${emailAddress}$`, "i") },
  });
}
