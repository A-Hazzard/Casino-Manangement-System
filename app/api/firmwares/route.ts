import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Firmware } from "@/app/api/lib/models/firmware";
import { GridFSBucket } from "mongodb";
import { Readable } from "stream";
import { generateMongoId } from "@/lib/utils/id";
import { logActivity } from "@/lib/helpers/activityLogger";
import { getUserFromServer } from "../lib/helpers/users";
import { getClientIP } from "@/lib/utils/ipAddress";

/**
 * GET /api/firmwares
 * Fetches all firmware documents with file metadata
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    let query = {};
    if (!includeDeleted) {
      query = {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date("2020-01-01") } },
        ],
      };
    }

    const firmwares = await Firmware.find(query)
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

    // Generate a proper MongoDB ObjectId-style hex string for the firmware
    const firmwareId = await generateMongoId();

    // Create firmware document
    const firmware = new Firmware({
      _id: firmwareId,
      product,
      version,
      versionDetails: versionDetails || "",
      fileId,
      fileName,
      fileSize,
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
      // Add missing fields with default values
      releaseDate: new Date(),
      description: versionDetails || "",
      downloadUrl: "",
      checksum: "",
    });

    await firmware.save();

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          { field: "product", oldValue: null, newValue: product },
          { field: "version", oldValue: null, newValue: version },
          { field: "versionDetails", oldValue: null, newValue: versionDetails || "" },
          { field: "fileName", oldValue: null, newValue: fileName },
          { field: "fileSize", oldValue: null, newValue: fileSize },
        ];

        await logActivity(
          {
            id: currentUser._id as string,
            email: currentUser.emailAddress as string,
            role: (currentUser.roles as string[])?.[0] || "user",
          },
          "CREATE",
          "Firmware",
          { id: firmwareId, name: `${product} v${version}` },
          createChanges,
          `Uploaded new firmware "${product} v${version}" (${fileName})`,
          getClientIP(request) || undefined
        );
      } catch (logError) {
        console.error("Failed to log activity:", logError);
      }
    }

    return NextResponse.json(firmware, { status: 201 });
  } catch (error) {
    console.error("Error uploading firmware:", error);
    return NextResponse.json(
      { error: "Failed to upload firmware" },
      { status: 500 }
    );
  }
}
