import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Firmware } from "@/app/api/lib/models/firmware";
import { logActivity } from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "@/lib/utils/user";
import { getClientIP } from "@/lib/utils/ipAddress";

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const id = req.nextUrl.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ message: "Firmware ID is required" }, { status: 400 });
    }

    // Get firmware data before deletion for logging
    const firmwareToDelete = await Firmware.findById(id);
    if (!firmwareToDelete) {
      return NextResponse.json({ message: "Firmware not found" }, { status: 404 });
    }

    await Firmware.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const deleteChanges = [
          { field: "product", oldValue: firmwareToDelete.product, newValue: null },
          { field: "version", oldValue: firmwareToDelete.version, newValue: null },
          { field: "versionDetails", oldValue: firmwareToDelete.versionDetails, newValue: null },
          { field: "fileName", oldValue: firmwareToDelete.fileName, newValue: null },
          { field: "fileSize", oldValue: firmwareToDelete.fileSize, newValue: null },
        ];

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "DELETE",
          "Firmware",
          { id, name: `${firmwareToDelete.product} v${firmwareToDelete.version}` },
          deleteChanges,
          `Deleted firmware "${firmwareToDelete.product} v${firmwareToDelete.version}" (${firmwareToDelete.fileName})`,
          getClientIP(req) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json({
      message: "Firmware deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting firmware:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Error deleting firmware", error: errorMessage },
      { status: 500 }
    );
  }
} 