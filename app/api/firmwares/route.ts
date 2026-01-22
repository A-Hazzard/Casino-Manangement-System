/**
 * Firmwares API Route
 *
 * This route handles operations related to firmware files.
 * It supports:
 * - GET: Fetching all firmware documents with optional deleted items inclusion
 * - POST: Uploading a new firmware file to GridFS and creating a firmware document
 *
 * @module app/api/firmwares/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Firmware } from '@/app/api/lib/models/firmware';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { GridFSBucket, Db } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

/**
 * Main GET handler for fetching firmwares
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Build query with optional deleted items filter
 * 4. Fetch firmwares sorted by creation date
 * 5. Return firmwares
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Build query with optional deleted items filter
    // ============================================================================
    let query = {};
    if (!includeDeleted) {
      query = {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      };
    }

    // ============================================================================
    // STEP 4: Fetch firmwares sorted by creation date
    // ============================================================================
    const firmwares = await Firmware.find(query).sort({ createdAt: -1 }).lean();

    // ============================================================================
    // STEP 5: Return firmwares
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Firmwares GET API] Completed in ${duration}ms`);
    }
    return NextResponse.json(firmwares);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch firmwares';
    console.error(
      `[Firmwares GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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
      throw new Error('Database connection failed');
    }
    const bucket = new GridFSBucket(db as unknown as Db, {
      bucketName: 'firmwares',
    });

    const formData = await request.formData();
    const product = formData.get('product') as string;
    const version = formData.get('version') as string;
    const versionDetails = formData.get('versionDetails') as string;
    const file = formData.get('file') as File;
    const fileSize = file.size;
    const fileName = file.name;

    // Validate required fields
    if (!product || !version || !file) {
      return NextResponse.json(
        { error: 'Product, version, and file are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.bin')) {
      return NextResponse.json(
        { error: 'Only .bin files are allowed' },
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
      stream.pipe(uploadStream).on('error', reject).on('finish', resolve);
    });

    // Generate a proper MongoDB ObjectId-style hex string for the firmware
    const firmwareId = await generateMongoId();

    // Create firmware document
    const firmware = new Firmware({
      _id: firmwareId,
      product,
      version,
      versionDetails: versionDetails || '',
      fileId,
      fileName,
      fileSize,
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
      // Add missing fields with default values
      releaseDate: new Date(),
      description: versionDetails || '',
      downloadUrl: '',
      checksum: '',
    });

    await firmware.save();

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          { field: 'product', oldValue: null, newValue: product },
          { field: 'version', oldValue: null, newValue: version },
          {
            field: 'versionDetails',
            oldValue: null,
            newValue: versionDetails || '',
          },
          { field: 'fileName', oldValue: null, newValue: fileName },
          { field: 'fileSize', oldValue: null, newValue: fileSize },
        ];

        await logActivity({
          action: 'CREATE',
          details: `Uploaded new firmware "${product} v${version}" (${fileName})`,
          ipAddress: getClientIP(request) || undefined,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          metadata: {
            resource: 'Firmware',
            resourceId: firmwareId,
            resourceName: `${product} v${version}`,
            changes: createChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json(firmware, { status: 201 });
  } catch (error) {
    console.error('Error uploading firmware:', error);
    return NextResponse.json(
      { error: 'Failed to upload firmware' },
      { status: 500 }
    );
  }
}
