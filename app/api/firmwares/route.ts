import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Firmware } from "@/app/api/lib/models/firmware";
import { GridFSBucket } from "mongodb";
import { Readable } from "stream";

/**
 * GET /api/firmwares
 * Fetches all firmware documents with file metadata
 */
export async function GET() {
  try {
    await connectDB();

    const firmwares = await Firmware.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(firmwares);
  } catch (error) {
    console.error("Error fetching firmwares:", error);
    return NextResponse.json(
      { error: "Failed to fetch firmwares" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/firmwares
 * Uploads a new firmware file to GridFS and creates a firmware document
 */
export async function POST(request: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      throw new Error("Database connection failed");
    }
    const bucket = new GridFSBucket(db, { bucketName: "firmwares" });

    const formData = await request.formData();
    const product = formData.get("product") as string;
    const version = formData.get("version") as string;
    const versionDetails = formData.get("versionDetails") as string;
    const file = formData.get("file") as File;
    const fileSize = file.size;
    const fileName = file.name;

    // Validate required fields
    if (!product || !version || !file) {
      return NextResponse.json(
        { error: "Product, version, and file are required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".bin")) {
      return NextResponse.json(
        { error: "Only .bin files are allowed" },
        { status: 400 }
      );
    }

    // Convert File to stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    // Upload file to GridFS
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date(),
      },
    });

    const fileId = uploadStream.id;

    // Pipe the file stream to GridFS
    await new Promise((resolve, reject) => {
      stream.pipe(uploadStream).on("error", reject).on("finish", resolve);
    });

    // Create firmware document
    const firmware = new Firmware({
      product,
      version,
      versionDetails: versionDetails || "",
      fileId,
      fileName,
      fileSize,
    });

    await firmware.save();

    return NextResponse.json(firmware, { status: 201 });
  } catch (error) {
    console.error("Error uploading firmware:", error);
    return NextResponse.json(
      { error: "Failed to upload firmware" },
      { status: 500 }
    );
  }
}
