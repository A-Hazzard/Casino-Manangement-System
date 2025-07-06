import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Firmware } from "@/app/api/lib/models/firmware";

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const id = req.nextUrl.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ message: "Firmware ID is required" }, { status: 400 });
    }

    const updatedFirmware = await Firmware.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!updatedFirmware) {
      return NextResponse.json({ message: "Firmware not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Firmware deleted successfully",
      firmware: updatedFirmware,
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