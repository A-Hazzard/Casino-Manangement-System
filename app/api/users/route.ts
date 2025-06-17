import { NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import UserModel from "@/app/api/lib/models/user";
import {
  hashPassword,
  validateEmail,
  validatePassword,
} from "@/app/api/lib/utils/validation";
import type { ResourcePermissions } from "@/lib/types/administration";
import { logActivity } from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "@/lib/utils/user";
import { getClientIP } from "@/lib/utils/ipAddress";

interface UserDocument {
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
}

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

export async function GET(): Promise<Response> {
  await connectDB();
  const users = await UserModel.find({}, "-password");
  // Map to User type fields
  const result = users.map((user: UserDocument) => ({
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
  return new Response(JSON.stringify({ users: result }), { status: 200 });
}

export async function PUT(request: NextRequest): Promise<Response> {
  await connectDB();
  const body = await request.json();
  const { _id, ...updateFields } = body;
  if (!_id) {
    return new Response(
      JSON.stringify({ success: false, message: "User ID is required" }),
      { status: 400 }
    );
  }

  // Get the original user for change tracking
  const originalUser = (await UserModel.findById(
    _id
  ).lean()) as unknown as OriginalUserType;
  if (!originalUser) {
    return new Response(
      JSON.stringify({ success: false, message: "User not found" }),
      { status: 404 }
    );
  }

  const update: UserUpdateData = {};

  // Handle password update
  if (updateFields.password) {
    update.password = await hashPassword(updateFields.password);
  }

  // Handle roles update
  if (updateFields.roles) {
    update.roles = updateFields.roles;
  }

  // Handle resource permissions update
  if (updateFields.resourcePermissions) {
    update.resourcePermissions =
      updateFields.resourcePermissions as ResourcePermissions;
  }

  // Handle profile updates
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
    // Build the profile update object
    update.profile = {
      ...originalUser.profile,
      firstName:
        updateFields.firstName !== undefined
          ? updateFields.firstName
          : originalUser.profile?.firstName,
      lastName:
        updateFields.lastName !== undefined
          ? updateFields.lastName
          : originalUser.profile?.lastName,
      middleName:
        updateFields.middleName !== undefined
          ? updateFields.middleName
          : originalUser.profile?.middleName,
      otherName:
        updateFields.otherName !== undefined
          ? updateFields.otherName
          : originalUser.profile?.otherName,
      gender:
        updateFields.gender !== undefined
          ? updateFields.gender
          : originalUser.profile?.gender,
      address: {
        ...originalUser.profile?.address,
        street:
          updateFields.street !== undefined
            ? updateFields.street
            : originalUser.profile?.address?.street,
        town:
          updateFields.town !== undefined
            ? updateFields.town
            : originalUser.profile?.address?.town,
        region:
          updateFields.region !== undefined
            ? updateFields.region
            : originalUser.profile?.address?.region,
        country:
          updateFields.country !== undefined
            ? updateFields.country
            : originalUser.profile?.address?.country,
        postalCode:
          updateFields.postalCode !== undefined
            ? updateFields.postalCode
            : originalUser.profile?.address?.postalCode,
      },
      identification: {
        ...originalUser.profile?.identification,
        dateOfBirth:
          updateFields.dateOfBirth !== undefined
            ? updateFields.dateOfBirth
            : originalUser.profile?.identification?.dateOfBirth,
        idType:
          updateFields.idType !== undefined
            ? updateFields.idType
            : originalUser.profile?.identification?.idType,
        idNumber:
          updateFields.idNumber !== undefined
            ? updateFields.idNumber
            : originalUser.profile?.identification?.idNumber,
        notes:
          updateFields.notes !== undefined
            ? updateFields.notes
            : originalUser.profile?.identification?.notes,
      },
    };
  }

  try {
    const updatedUser = await UserModel.findByIdAndUpdate(_id, update, {
      new: true,
    });
    if (!updatedUser) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404 }
      );
    }

    // Log activity if user is authenticated
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        // Calculate changes for activity logging
        const changes = [];

        // Check profile changes
        if (
          updateFields.firstName !== undefined &&
          updateFields.firstName !== originalUser.profile?.firstName
        ) {
          changes.push({
            field: "firstName",
            oldValue: originalUser.profile?.firstName || "",
            newValue: updateFields.firstName || "",
          });
        }
        if (
          updateFields.lastName !== undefined &&
          updateFields.lastName !== originalUser.profile?.lastName
        ) {
          changes.push({
            field: "lastName",
            oldValue: originalUser.profile?.lastName || "",
            newValue: updateFields.lastName || "",
          });
        }
        if (
          updateFields.middleName !== undefined &&
          updateFields.middleName !== originalUser.profile?.middleName
        ) {
          changes.push({
            field: "middleName",
            oldValue: originalUser.profile?.middleName || "",
            newValue: updateFields.middleName || "",
          });
        }
        if (
          updateFields.otherName !== undefined &&
          updateFields.otherName !== originalUser.profile?.otherName
        ) {
          changes.push({
            field: "otherName",
            oldValue: originalUser.profile?.otherName || "",
            newValue: updateFields.otherName || "",
          });
        }
        if (
          updateFields.gender !== undefined &&
          updateFields.gender !== originalUser.profile?.gender
        ) {
          changes.push({
            field: "gender",
            oldValue: originalUser.profile?.gender || "",
            newValue: updateFields.gender || "",
          });
        }

        // Check address changes
        if (
          updateFields.street !== undefined &&
          updateFields.street !== originalUser.profile?.address?.street
        ) {
          changes.push({
            field: "address.street",
            oldValue: originalUser.profile?.address?.street || "",
            newValue: updateFields.street || "",
          });
        }
        if (
          updateFields.town !== undefined &&
          updateFields.town !== originalUser.profile?.address?.town
        ) {
          changes.push({
            field: "address.town",
            oldValue: originalUser.profile?.address?.town || "",
            newValue: updateFields.town || "",
          });
        }
        if (
          updateFields.region !== undefined &&
          updateFields.region !== originalUser.profile?.address?.region
        ) {
          changes.push({
            field: "address.region",
            oldValue: originalUser.profile?.address?.region || "",
            newValue: updateFields.region || "",
          });
        }
        if (
          updateFields.country !== undefined &&
          updateFields.country !== originalUser.profile?.address?.country
        ) {
          changes.push({
            field: "address.country",
            oldValue: originalUser.profile?.address?.country || "",
            newValue: updateFields.country || "",
          });
        }
        if (
          updateFields.postalCode !== undefined &&
          updateFields.postalCode !== originalUser.profile?.address?.postalCode
        ) {
          changes.push({
            field: "address.postalCode",
            oldValue: originalUser.profile?.address?.postalCode || "",
            newValue: updateFields.postalCode || "",
          });
        }

        // Check identification changes
        if (
          updateFields.dateOfBirth !== undefined &&
          updateFields.dateOfBirth !==
            originalUser.profile?.identification?.dateOfBirth
        ) {
          changes.push({
            field: "identification.dateOfBirth",
            oldValue: originalUser.profile?.identification?.dateOfBirth || "",
            newValue: updateFields.dateOfBirth || "",
          });
        }
        if (
          updateFields.idType !== undefined &&
          updateFields.idType !== originalUser.profile?.identification?.idType
        ) {
          changes.push({
            field: "identification.idType",
            oldValue: originalUser.profile?.identification?.idType || "",
            newValue: updateFields.idType || "",
          });
        }
        if (
          updateFields.idNumber !== undefined &&
          updateFields.idNumber !==
            originalUser.profile?.identification?.idNumber
        ) {
          changes.push({
            field: "identification.idNumber",
            oldValue: originalUser.profile?.identification?.idNumber || "",
            newValue: updateFields.idNumber || "",
          });
        }
        if (
          updateFields.notes !== undefined &&
          updateFields.notes !== originalUser.profile?.identification?.notes
        ) {
          changes.push({
            field: "identification.notes",
            oldValue: originalUser.profile?.identification?.notes || "",
            newValue: updateFields.notes || "",
          });
        }

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "UPDATE",
          "User",
          {
            id: _id,
            name: updatedUser.username || updatedUser.emailAddress,
          },
          changes,
          `Updated user profile for "${
            updatedUser.username || updatedUser.emailAddress
          }"`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
        // Don't fail the request if logging fails
      }
    }
    return new Response(JSON.stringify({ success: true, user: updatedUser }), {
      status: 200,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        message: "Update failed",
        error: errorMsg,
      }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  await connectDB();
  const body = await request.json();
  const { _id } = body;
  if (!_id) {
    return new Response(
      JSON.stringify({ success: false, message: "User ID is required" }),
      { status: 400 }
    );
  }
  try {
    const deletedUser = await UserModel.findByIdAndDelete(_id);
    if (!deletedUser) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404 }
      );
    }

    // Log activity if user is authenticated
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        // Create detailed changes for DELETE operation showing all deleted fields
        const deleteChanges = [
          {
            field: "username",
            oldValue: deletedUser.username,
            newValue: null,
          },
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
          {
            field: "isEnabled",
            oldValue: deletedUser.isEnabled,
            newValue: null,
          },
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
          {
            id: _id,
            name: deletedUser.username || deletedUser.emailAddress,
          },
          deleteChanges,
          `Deleted user "${deletedUser.username || deletedUser.emailAddress}"`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
        // Don't fail the request if logging fails
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        message: "Delete failed",
        error: errorMsg,
      }),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  await connectDB();
  const body = await request.json();
  const {
    username,
    emailAddress,
    password,
    roles = [],
    profile = {},
    isEnabled = true,
    profilePicture = null,
    resourcePermissions = {},
  } = body;

  // Validation
  if (!username || typeof username !== "string") {
    return new Response(
      JSON.stringify({ success: false, message: "Username is required" }),
      { status: 400 }
    );
  }
  if (!emailAddress || !validateEmail(emailAddress)) {
    return new Response(
      JSON.stringify({ success: false, message: "Valid email is required" }),
      { status: 400 }
    );
  }
  if (!password || !validatePassword(password)) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Password must be at least 6 characters",
      }),
      { status: 400 }
    );
  }
  // Check for duplicate username/email
  const existingUser = await UserModel.findOne({
    $or: [{ username }, { emailAddress }],
  });
  if (existingUser) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Username or email already exists",
      }),
      { status: 409 }
    );
  }
  // Hash password
  const hashedPassword = await hashPassword(password);
  // Create user
  try {
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
    // Exclude password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _unused, ...userWithoutPassword } = newUser.toObject();

    // Log activity if user is authenticated
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        // Create detailed changes for CREATE operation showing all created fields
        const createChanges = [
          {
            field: "username",
            oldValue: null,
            newValue: username,
          },
          {
            field: "emailAddress",
            oldValue: null,
            newValue: emailAddress,
          },
          {
            field: "roles",
            oldValue: null,
            newValue: roles.join(", "),
          },
          {
            field: "isEnabled",
            oldValue: null,
            newValue: isEnabled,
          },
          {
            field: "firstName",
            oldValue: null,
            newValue: profile.firstName || "",
          },
          {
            field: "lastName",
            oldValue: null,
            newValue: profile.lastName || "",
          },
          {
            field: "gender",
            oldValue: null,
            newValue: profile.gender || "",
          },
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
          {
            id: newUser._id.toString(),
            name: username,
          },
          createChanges,
          `Created new user "${username}" with email ${emailAddress}`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
        // Don't fail the request if logging fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: userWithoutPassword }),
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        message: "User creation failed",
        error: errorMsg,
      }),
      { status: 500 }
    );
  }
}
