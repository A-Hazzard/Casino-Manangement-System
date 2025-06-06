import { NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import UserModel from "@/app/api/lib/models/user";
import {
  hashPassword,
  validateEmail,
  validatePassword,
} from "@/app/api/lib/utils/validation";
import type { User, ResourcePermissions } from "@/lib/types/administration";

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

export async function GET(): Promise<Response> {
  await connectDB();
  const users = await UserModel.find({}, "-_id -password");
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
  const update: Partial<User> = {};
  if (updateFields.password) {
    update.password = await hashPassword(updateFields.password);
  }
  if (updateFields.roles) {
    update.roles = updateFields.roles;
  }
  if (updateFields.resourcePermissions) {
    update.resourcePermissions =
      updateFields.resourcePermissions as ResourcePermissions;
  }
  // Add other fields as needed
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
