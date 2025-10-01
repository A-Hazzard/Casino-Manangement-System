import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { JWTPayload, jwtVerify } from "jose";
import { getCurrentDbConnectionString, getJwtSecret } from "@/lib/utils/auth";
import UserModel from "../models/user";
import { hashPassword } from "../utils/validation";
import type { ResourcePermissions } from "@/lib/types/administration";
import { logActivity } from "./activityLogger";
import { getClientIP } from "@/lib/utils/ipAddress";
import type {
  CurrentUser,
  UserDocument,
  UserDocumentWithPassword,
  OriginalUserType,
} from "@/shared/types/users";

/**
 * Validates database context from JWT token
 */
function validateDatabaseContext(
  tokenPayload: Record<string, unknown>
): boolean {
  if (!tokenPayload.dbContext) {
    console.warn(
      "JWT token missing database context - forcing re-authentication"
    );
    return false;
  }

  const currentDbContext = {
    connectionString: getCurrentDbConnectionString(),
  };

  const tokenDbContext = tokenPayload.dbContext as {
    connectionString?: string;
  };

  // Check if database context has changed
  if (tokenDbContext.connectionString !== currentDbContext.connectionString) {
    console.warn("Database context mismatch - forcing re-authentication", {
      tokenContext: tokenDbContext,
      currentContext: currentDbContext,
    });
    return false;
  }

  return true;
}

/**
 * Server-side function to get user from JWT token in cookies
 */
export async function getUserFromServer(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(getJwtSecret())
    );

    // Validate database context
    if (!validateDatabaseContext(payload)) {
      console.warn(
        "Database context validation failed - token invalid for current database"
      );
      return null;
    }

    return payload as JWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Server-side function to get user ID from JWT token
 */
export async function getUserIdFromServer(): Promise<string | null> {
  const user: JWTPayload | null = await getUserFromServer();
  if (user) {
    // console.log("Extracted user ID from JWT:", user._id);
    // console.log("JWT payload:", user);
  }
  return user ? (user._id as string) : null;
}

/**
 * Finds a user by email address (case-insensitive).
 *
 * @param emailAddress - The email address to search for.
 * @returns Promise resolving to a UserDocument or null if not found.
 */
export async function getUserByEmail(
  emailAddress: string
): Promise<UserDocumentWithPassword | null> {
  return UserModel.findOne({
    emailAddress: { $regex: new RegExp(`^${emailAddress}$`, "i") },
  });
}

/**
 * Finds a user by username (case-insensitive).
 */
export async function getUserByUsername(
  username: string
): Promise<UserDocumentWithPassword | null> {
  return UserModel.findOne({
    username: { $regex: new RegExp(`^${username}$`, "i") },
  });
}

/**
 * Formats user data for frontend consumption
 */
export function formatUsersForResponse(users: UserDocument[]) {
  return users.map((user: UserDocument) => ({
    _id: user._id,
    name: `${user.profile?.firstName ?? ""} ${
      user.profile?.lastName ?? ""
    }`.trim(),
    username: user.username,
    email: user.emailAddress,
    enabled: user.isEnabled,
    roles: user.roles,
    profilePicture: user.profilePicture ?? null,
  }));
}

/**
 * Retrieves all users from database
 */
export async function getAllUsers() {
  return await UserModel.find(
    {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    },
    "-password"
  );
}

/**
 * Retrieves a user by ID from database
 */
export async function getUserById(userId: string) {
  return await UserModel.findById(userId, "-password");
}

/**
 * Creates a new user with activity logging
 */
export async function createUser(
  data: {
    username: string;
    emailAddress: string;
    password: string;
    roles?: string[];
    profile?: Record<string, unknown>;
    isEnabled?: boolean;
    profilePicture?: string | null;
    resourcePermissions?: ResourcePermissions;
  },
  request: NextRequest
) {
  const {
    username,
    emailAddress,
    password,
    roles = [],
    profile = {},
    isEnabled = true,
    profilePicture = null,
    resourcePermissions = {},
  } = data;

  const existingUser = await UserModel.findOne({
    $or: [{ username }, { emailAddress }],
  });

  if (existingUser) {
    throw new Error("Username or email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const newUser = await UserModel.create({
    _id: new (await import("mongoose")).default.Types.ObjectId().toHexString(),
    username,
    emailAddress,
    password: hashedPassword,
    roles,
    profile,
    isEnabled,
    profilePicture,
    resourcePermissions,
    deletedAt: new Date(-1), // SMIB boards require all fields to be present
  });

  const currentUser = await getUserFromServer();
  if (currentUser && currentUser.emailAddress) {
    try {
      const createChanges = [
        { field: "username", oldValue: null, newValue: username },
        { field: "emailAddress", oldValue: null, newValue: emailAddress },
        { field: "roles", oldValue: null, newValue: roles.join(", ") },
        { field: "isEnabled", oldValue: null, newValue: isEnabled },
        {
          field: "firstName",
          oldValue: null,
          newValue: profile.firstName || "",
        },
        { field: "lastName", oldValue: null, newValue: profile.lastName || "" },
        { field: "gender", oldValue: null, newValue: profile.gender || "" },
        {
          field: "profilePicture",
          oldValue: null,
          newValue: profilePicture || "None",
        },
      ];

      await logActivity({
        action: "CREATE",
        details: `Created new user "${username}" with email ${emailAddress}`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        userId: currentUser._id as string,
        username: currentUser.emailAddress as string,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || "user",
          resource: "User",
          resourceId: newUser._id.toString(),
          resourceName: username,
          changes: createChanges,
        },
      });
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }
  }

  const userObject = newUser.toObject();
  // Password is intentionally excluded from return value for security
  delete userObject.password;
  return userObject;
}

/**
 * Updates a user's information and logs the activity
 */
export async function updateUser(
  _id: string,
  updateFields: Record<string, unknown>,
  request: NextRequest
) {
  const user = await UserModel.findById(_id);
  if (!user) {
    throw new Error("User not found");
  }

  // Validate and hash password if provided
  if (updateFields.password && typeof updateFields.password === "string") {
    const { validatePasswordStrength } = await import("@/lib/utils/validation");
    const passwordValidation = validatePasswordStrength(updateFields.password);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Password requirements not met: ${passwordValidation.feedback.join(
          ", "
        )}`
      );
    }
    // Hash the password before saving
    const { hashPassword } = await import("@/app/api/lib/utils/validation");
    updateFields.password = await hashPassword(updateFields.password);
  }

  // Calculate changes for activity log
  const changes = calculateUserChanges(user.toObject(), updateFields);

  // Update user
  const updatedUser = await UserModel.findByIdAndUpdate(
    _id,
    { $set: updateFields },
    { new: true }
  );

  // Log activity
  const currentUser = (await getUserFromServer()) as CurrentUser | null;
  const clientIP = getClientIP(request);
  if (currentUser && currentUser.emailAddress) {
    await logActivity({
      action: "update",
      details: `Updated user profile for "${updatedUser.username || "user"}"`,
      ipAddress: clientIP || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      userId: currentUser._id as string,
      username: currentUser.emailAddress as string,
      metadata: {
        userId: currentUser._id,
        userEmail: currentUser.emailAddress,
        userRole: currentUser.roles[0] || "user",
        resource: "user",
        resourceId: _id,
        resourceName: updatedUser.username || "",
        changes: changes,
      },
    });
  }

  return updatedUser;
}

/**
 * Deletes a user with activity logging (soft delete)
 */
export async function deleteUser(_id: string, request: NextRequest) {
  const deletedUser = await UserModel.findByIdAndUpdate(
    _id,
    {
      deletedAt: new Date(),
      updatedAt: new Date(),
    },
    { new: true }
  );
  if (!deletedUser) {
    throw new Error("User not found");
  }

  const currentUser = await getUserFromServer();
  if (currentUser && currentUser.emailAddress) {
    try {
      const deleteChanges = [
        { field: "username", oldValue: deletedUser.username, newValue: null },
        {
          field: "emailAddress",
          oldValue: deletedUser.emailAddress,
          newValue: null,
        },
        {
          field: "roles",
          oldValue: deletedUser.roles?.join(", ") || "",
          newValue: null,
        },
        { field: "isEnabled", oldValue: deletedUser.isEnabled, newValue: null },
        {
          field: "firstName",
          oldValue: deletedUser.profile?.firstName || "",
          newValue: null,
        },
        {
          field: "lastName",
          oldValue: deletedUser.profile?.lastName || "",
          newValue: null,
        },
        {
          field: "gender",
          oldValue: deletedUser.profile?.gender || "",
          newValue: null,
        },
        {
          field: "profilePicture",
          oldValue: deletedUser.profilePicture || "None",
          newValue: null,
        },
      ];

      await logActivity({
        action: "DELETE",
        details: `Deleted user "${
          deletedUser.username || deletedUser.emailAddress
        }"`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        userId: currentUser._id as string,
        username: currentUser.emailAddress as string,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || "user",
          resource: "User",
          resourceId: _id,
          resourceName: deletedUser.username || deletedUser.emailAddress,
          changes: deleteChanges,
        },
      });
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }
  }

  return deletedUser;
}

/**
 * Calculates changes between original user and update fields
 */
function calculateUserChanges(
  originalUser: OriginalUserType,
  updateFields: Record<string, unknown>
) {
  const changes: Array<{ field: string; oldValue: string; newValue: string }> =
    [];

  const fieldChecks = [
    {
      field: "firstName",
      original: originalUser.profile?.firstName,
      updated: updateFields.firstName,
    },
    {
      field: "lastName",
      original: originalUser.profile?.lastName,
      updated: updateFields.lastName,
    },
    {
      field: "middleName",
      original: originalUser.profile?.middleName,
      updated: updateFields.middleName,
    },
    {
      field: "otherName",
      original: originalUser.profile?.otherName,
      updated: updateFields.otherName,
    },
    {
      field: "gender",
      original: originalUser.profile?.gender,
      updated: updateFields.gender,
    },
    {
      field: "address.street",
      original: originalUser.profile?.address?.street,
      updated: updateFields.street,
    },
    {
      field: "address.town",
      original: originalUser.profile?.address?.town,
      updated: updateFields.town,
    },
    {
      field: "address.region",
      original: originalUser.profile?.address?.region,
      updated: updateFields.region,
    },
    {
      field: "address.country",
      original: originalUser.profile?.address?.country,
      updated: updateFields.country,
    },
    {
      field: "address.postalCode",
      original: originalUser.profile?.address?.postalCode,
      updated: updateFields.postalCode,
    },
    {
      field: "identification.dateOfBirth",
      original: originalUser.profile?.identification?.dateOfBirth,
      updated: updateFields.dateOfBirth,
    },
    {
      field: "identification.idType",
      original: originalUser.profile?.identification?.idType,
      updated: updateFields.idType,
    },
    {
      field: "identification.idNumber",
      original: originalUser.profile?.identification?.idNumber,
      updated: updateFields.idNumber,
    },
    {
      field: "identification.notes",
      original: originalUser.profile?.identification?.notes,
      updated: updateFields.notes,
    },
  ];

  fieldChecks.forEach(({ field, original, updated }) => {
    if (updated !== undefined && updated !== original) {
      changes.push({
        field,
        oldValue: (original as string) || "",
        newValue: (updated as string) || "",
      });
    }
  });

  return changes;
}
