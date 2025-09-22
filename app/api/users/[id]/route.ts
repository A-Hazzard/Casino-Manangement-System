import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import UserModel from "@/app/api/lib/models/user";

export async function GET(request: NextRequest) {
  await connectDB();
  try {
    const id = request.nextUrl.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    // console.log("Looking for user with ID:", id);

    let user = await UserModel.findById(id).select("-password");
    if (!user) {
      // Fallback: if ID stored as ObjectId, try converting
      try {
        const { Types } = await import("mongoose");
        const asObjectId = new Types.ObjectId(id);
        user = await UserModel.findById(asObjectId).select("-password");
        // console.log("Tried ObjectId conversion, found user:", !!user);
      } catch (conversionError) {
        console.warn("Failed to convert ID to ObjectId:", conversionError);
      }
    }

    if (!user) {
      // console.log("User not found in database for ID:", id);
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const userObject = {
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
    };

    return NextResponse.json({ success: true, user: userObject });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  await connectDB();
  try {
    const id = request.nextUrl.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { profile, password, profilePicture } = body;

    let user = await UserModel.findById(id);
    if (!user) {
      try {
        const { Types } = await import("mongoose");
        const asObjectId = new Types.ObjectId(id);
        user = await UserModel.findById(asObjectId);
      } catch {}
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const updateFields: Record<string, unknown> = {};

    if (profile) {
      // Flatten profile fields for update
      for (const [key, value] of Object.entries(profile)) {
        if (typeof value === "object" && value !== null) {
          for (const [subKey, subValue] of Object.entries(value)) {
            updateFields[`profile.${key}.${subKey}`] = subValue;
          }
        } else {
          updateFields[`profile.${key}`] = value;
        }
      }
    }

    if (password && password.new) {
      const { comparePassword, hashPassword } = await import(
        "@/app/api/lib/utils/validation"
      );
      const isMatch = await comparePassword(password.current, user.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, message: "Incorrect current password" },
          { status: 400 }
        );
      }
      updateFields.password = await hashPassword(password.new);
    }

    if (profilePicture !== undefined) {
      updateFields.profilePicture = profilePicture;
    }

    // Call updateUser helper for logging and update
    const { updateUser } = await import("@/app/api/lib/helpers/users");
    const updatedUser = await updateUser(id, updateFields, request);

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
