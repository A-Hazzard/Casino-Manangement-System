import { NextRequest } from "next/server";
import UserModel from "../models/user";
import { hashPassword } from "../utils/validation";
import type { ResourcePermissions } from "@/lib/types/administration";
import { logActivity } from "./activityLogger";
import { getUserFromServer } from "@/lib/utils/user";
import { getClientIP } from "@/lib/utils/ipAddress";

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

type UserDocument = {
  _id: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    gender?: string;
  };
  username: string;
  emailAddress: string;
  isEnabled: boolean;
  roles: string[];
  profilePicture?: string | null;
};

type UserDocumentWithPassword = UserDocument & {
  password?: string;
  permissions?: string[];
  resourcePermissions?: {
    [key: string]: {
      entity: string;
      resources: string[];
    };
  };
  toObject: (options?: Record<string, unknown>) => {
    _id: string;
    emailAddress: string;
    isEnabled: boolean;
    roles: string[];
    permissions?: string[];
    resourcePermissions?: {
      [key: string]: {
        entity: string;
        resources: string[];
      };
    };
    [key: string]: unknown;
  };
};

type OriginalUserType = {
  _id: string;
  username: string;
  emailAddress: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: string;
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: string;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
  };
};

type UserUpdateData = {
  password?: string;
  roles?: string[];
  resourcePermissions?: ResourcePermissions;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  otherName?: string;
  gender?: string;
  street?: string;
  town?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  dateOfBirth?: string;
  idType?: string;
  idNumber?: string;
  notes?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: string;
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: string;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
  };
};

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
  return await UserModel.find({}, "-password");
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
    username,
    emailAddress,
    password: hashedPassword,
    roles,
    profile,
    isEnabled,
    profilePicture,
    resourcePermissions,
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

      await logActivity(
        {
          id: currentUser._id as string,
          email: currentUser.emailAddress as string,
          role: (currentUser.roles as string[])?.[0] || "user",
        },
        "CREATE",
        "User",
        { id: newUser._id.toString(), name: username },
        createChanges,
        `Created new user "${username}" with email ${emailAddress}`,
        getClientIP(request) || undefined
      );
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _unused, ...userWithoutPassword } = newUser.toObject();
  return userWithoutPassword;
}

/**
 * Updates an existing user with activity logging
 */
export async function updateUser(
  _id: string,
  updateFields: Record<string, unknown>,
  request: NextRequest
) {
  const originalUser = (await UserModel.findById(
    _id
  ).lean()) as unknown as OriginalUserType;
  if (!originalUser) {
    throw new Error("User not found");
  }

  const update: UserUpdateData = {};

  if (updateFields.password) {
    update.password = await hashPassword(updateFields.password as string);
  }

  if (updateFields.roles) {
    update.roles = updateFields.roles as string[];
  }

  if (updateFields.resourcePermissions) {
    update.resourcePermissions =
      updateFields.resourcePermissions as ResourcePermissions;
  }

  if (
    updateFields.firstName !== undefined ||
    updateFields.lastName !== undefined ||
    updateFields.middleName !== undefined ||
    updateFields.otherName !== undefined ||
    updateFields.gender !== undefined ||
    updateFields.street !== undefined ||
    updateFields.town !== undefined ||
    updateFields.region !== undefined ||
    updateFields.country !== undefined ||
    updateFields.postalCode !== undefined ||
    updateFields.dateOfBirth !== undefined ||
    updateFields.idType !== undefined ||
    updateFields.idNumber !== undefined ||
    updateFields.notes !== undefined
  ) {
    update.profile = {
      ...originalUser.profile,
      firstName:
        updateFields.firstName !== undefined
          ? (updateFields.firstName as string)
          : originalUser.profile?.firstName,
      lastName:
        updateFields.lastName !== undefined
          ? (updateFields.lastName as string)
          : originalUser.profile?.lastName,
      middleName:
        updateFields.middleName !== undefined
          ? (updateFields.middleName as string)
          : originalUser.profile?.middleName,
      otherName:
        updateFields.otherName !== undefined
          ? (updateFields.otherName as string)
          : originalUser.profile?.otherName,
      gender:
        updateFields.gender !== undefined
          ? (updateFields.gender as string)
          : originalUser.profile?.gender,
      address: {
        ...originalUser.profile?.address,
        street:
          updateFields.street !== undefined
            ? (updateFields.street as string)
            : originalUser.profile?.address?.street,
        town:
          updateFields.town !== undefined
            ? (updateFields.town as string)
            : originalUser.profile?.address?.town,
        region:
          updateFields.region !== undefined
            ? (updateFields.region as string)
            : originalUser.profile?.address?.region,
        country:
          updateFields.country !== undefined
            ? (updateFields.country as string)
            : originalUser.profile?.address?.country,
        postalCode:
          updateFields.postalCode !== undefined
            ? (updateFields.postalCode as string)
            : originalUser.profile?.address?.postalCode,
      },
      identification: {
        ...originalUser.profile?.identification,
        dateOfBirth:
          updateFields.dateOfBirth !== undefined
            ? (updateFields.dateOfBirth as string)
            : originalUser.profile?.identification?.dateOfBirth,
        idType:
          updateFields.idType !== undefined
            ? (updateFields.idType as string)
            : originalUser.profile?.identification?.idType,
        idNumber:
          updateFields.idNumber !== undefined
            ? (updateFields.idNumber as string)
            : originalUser.profile?.identification?.idNumber,
        notes:
          updateFields.notes !== undefined
            ? (updateFields.notes as string)
            : originalUser.profile?.identification?.notes,
      },
    };
  }

  const updatedUser = await UserModel.findByIdAndUpdate(_id, update, {
    new: true,
  });
  if (!updatedUser) {
    throw new Error("User not found");
  }

  const currentUser = await getUserFromServer();
  if (currentUser && currentUser.emailAddress) {
    try {
      const changes = calculateUserChanges(originalUser, updateFields);
      await logActivity(
        {
          id: currentUser._id as string,
          email: currentUser.emailAddress as string,
          role: (currentUser.roles as string[])?.[0] || "user",
        },
        "UPDATE",
        "User",
        { id: _id, name: updatedUser.username || updatedUser.emailAddress },
        changes,
        `Updated user profile for "${
          updatedUser.username || updatedUser.emailAddress
        }"`,
        getClientIP(request) || undefined
      );
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }
  }

  return updatedUser;
}

/**
 * Deletes a user with activity logging
 */
export async function deleteUser(_id: string, request: NextRequest) {
  const deletedUser = await UserModel.findByIdAndDelete(_id);
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

      await logActivity(
        {
          id: currentUser._id as string,
          email: currentUser.emailAddress as string,
          role: (currentUser.roles as string[])?.[0] || "user",
        },
        "DELETE",
        "User",
        { id: _id, name: deletedUser.username || deletedUser.emailAddress },
        deleteChanges,
        `Deleted user "${deletedUser.username || deletedUser.emailAddress}"`,
        getClientIP(request) || undefined
      );
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
