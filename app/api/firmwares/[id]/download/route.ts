import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Firmware } from "@/app/api/lib/models/firmware";
import { GridFSBucket } from "mongodb";

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

    // Find the firmware document
    const id = request.nextUrl.pathname.split("/")[3];
    const firmware = await Firmware.findById(id);
    if (!firmware) {
      return NextResponse.json(
        { error: "Firmware not found" },
        { status: 404 }
      );
    }

    // Check if file exists in GridFS
    const files = await bucket.find({ _id: firmware.fileId }).toArray();
    if (files.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const file = files[0];

    // Create download stream
    const downloadStream = bucket.openDownloadStream(firmware.fileId);

    // Convert stream to response
    const chunks: Buffer[] = [];

    return new Promise<NextResponse>((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks);

        const response = new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${file.filename}"`,
            "Content-Length": buffer.length.toString(),
          },
        });

        resolve(response);
      });

      downloadStream.on("error", (error) => {
        console.error("Error downloading file:", error);
        reject(
          NextResponse.json(
            { error: "Failed to download file" },
            { status: 500 }
          )
        );
      });
    });
  } catch (error) {
    console.error("Error in download endpoint:", error);
    return NextResponse.json(
      { error: "Failed to download firmware" },
      { status: 500 }
    );
  }
}
