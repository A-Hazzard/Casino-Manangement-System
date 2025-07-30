import { NextRequest } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import {
  validateEmail,
  validatePassword,
} from "@/app/api/lib/utils/validation";
import {
  getAllUsers,
  createUser as createUserHelper,
  updateUser as updateUserHelper,
  deleteUser as deleteUserHelper,
} from "@/app/api/lib/helpers/users";

export async function GET(request: NextRequest): Promise<Response> {
  await connectDB();

  try {
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get("licensee");

    const users = await getAllUsers();
    let result = users.map((user) => ({
      _id: user._id,
      name: `${user.profile?.firstName ?? ""} ${
        user.profile?.lastName ?? ""
      }`.trim(),
      username: user.username,
      email: user.emailAddress,
      enabled: user.isEnabled,
      roles: user.roles,
      profilePicture: user.profilePicture ?? null,
      profile: user.profile,
      resourcePermissions: user.resourcePermissions,
    }));

    // Filter by licensee if provided
    if (licensee && licensee !== "all") {
      // Note: This assumes users have a licensee field or relationship
      // You may need to adjust this based on your actual user data structure
      result = result.filter((user) => {
        // For now, return all users since the user model may not have licensee filtering
        // This can be updated when the user model includes licensee information
        return true;
      });
    }

    return new Response(JSON.stringify({ users: result }), { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to fetch users" }),
      { status: 500 }
    );
  }
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

  try {
    const updatedUser = await updateUserHelper(_id, updateFields, request);
    return new Response(JSON.stringify({ success: true, user: updatedUser }), {
      status: 200,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMsg === "User not found" ? errorMsg : "Update failed",
        error: errorMsg,
      }),
      { status: errorMsg === "User not found" ? 404 : 500 }
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
    await deleteUserHelper(_id, request);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMsg === "User not found" ? errorMsg : "Delete failed",
        error: errorMsg,
      }),
      { status: errorMsg === "User not found" ? 404 : 500 }
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

  try {
    const userWithoutPassword = await createUserHelper(
      {
        username,
        emailAddress,
        password,
        roles,
        profile,
        isEnabled,
        profilePicture,
        resourcePermissions,
      },
      request
    );

    return new Response(
      JSON.stringify({ success: true, user: userWithoutPassword }),
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        message:
          errorMsg === "Username or email already exists"
            ? errorMsg
            : "User creation failed",
        error: errorMsg,
      }),
      { status: errorMsg === "Username or email already exists" ? 409 : 500 }
    );
  }
}
