import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Firmware } from "@/app/api/lib/models/firmware";
import { GridFSBucket } from "mongodb";
import { logActivity } from "@/app/api/lib/helpers/activityLogger";
import { getUserFromServer } from "../../../lib/helpers/users";
import { getClientIP } from "@/lib/utils/ipAddress";

/**
 * GET /api/firmwares/[id]/download
 * Downloads a firmware file from GridFS
 */
export async function GET(request: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      throw new Error("Database connection failed");
    }
    const bucket = new GridFSBucket(db, { bucketName: "firmwares" });

    // Find the firmware document (don't filter by deletedAt for downloads)
    const id = request.nextUrl.pathname.split("/")[3];
    const firmware = await Firmware.findById(id);
    if (!firmware) {
      return NextResponse.json(
        { error: "Firmware not found" },
        { status: 404 }
      );
    }

    // Handle both old and new firmware formats
    let fileName: string;
    let fileSize: number;
    let fileBuffer: Buffer;

    if (firmware.fileId) {
      // New format: file stored in GridFS
      const files = await bucket.find({ _id: firmware.fileId }).toArray();
      if (files.length === 0) {

        return NextResponse.json(
          { error: "File not found in GridFS" },
          { status: 404 }
        );

        return NextResponse.json({ error: "File not found in GridFS" }, { status: 404 });
      }
      const file = files[0];
      fileName = firmware.fileName || file.filename;
      fileSize = firmware.fileSize || file.length;


      // Create download stream from GridFS
      const downloadStream = bucket.openDownloadStream(firmware.fileId);
      const chunks: Buffer[] = [];

      
      await new Promise<void>((resolve, reject) => {
        downloadStream.on("data", (chunk) => chunks.push(chunk));
        downloadStream.on("end", () => resolve());
        downloadStream.on("error", reject);
      });


      fileBuffer = Buffer.concat(chunks);
    } else if (firmware.file && typeof firmware.file === "object") {
      // Old format: file stored in filesystem
      const fs = await import("fs");

      const filePath = firmware.file.path;
      if (!filePath || !fs.existsSync(filePath)) {
        return NextResponse.json(
          { error: "File not found in filesystem" },
          { status: 404 }
        );
      }

      fileName =
        firmware.file.originalname || firmware.file.filename || "firmware.bin";
      fileSize = firmware.file.size || 0;
      fileBuffer = fs.readFileSync(filePath);
    } else {
      return NextResponse.json(
        { error: "Invalid firmware format" },
        { status: 400 }
      );
    }


    // Return the file as response
    const response = new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });

    // Log download activity only after successful file preparation
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "DOWNLOAD",
          "Firmware",
          { id, name: `${firmware.product} v${firmware.version}` },
          [
            { field: "fileName", oldValue: null, newValue: fileName },
            { field: "fileSize", oldValue: null, newValue: fileSize },
            { field: "product", oldValue: null, newValue: firmware.product },
            { field: "version", oldValue: null, newValue: firmware.version },
          ],
          `Downloaded firmware "${firmware.product} v${firmware.version}" (${fileName})`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log download activity:", logError);
      }
    }

    return response;
  } catch (error) {
    console.error("Error in download endpoint:", error);
    return NextResponse.json(
      { error: "Failed to download firmware" },
      { status: 500 }
    );
  }
}
