/**
 * Collection Report V2 — Image Upload API
 *
 * POST /api/collection-reports-v2/upload
 * Accepts a FormData payload with a machine meter photo and stores it in
 * MongoDB GridFS under the `collection_v2_images` bucket.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import {
  extractUserFromRequest,
  logRouteCreate,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import { NextRequest, NextResponse } from 'next/server';

const BUCKET_NAME = 'collection_v2_images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
];

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/collection-reports-v2/upload';
  const user = extractUserFromRequest(req);

  try {
    const db = await connectDB();

    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('sessionId') as string | null;
    const machineId = formData.get('machineId') as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    if (!sessionId || !machineId) {
      return NextResponse.json(
        { success: false, error: 'sessionId and machineId are required' },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only images are allowed.',
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum 10 MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });

    const filename = `v2_${sessionId}_${machineId}_${Date.now()}${getExtension(file.name)}`;
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: String(userPayload._id),
        sessionId,
        machineId,
        context: 'collection_v2_meter_photo',
      },
    });

    await new Promise<void>((resolve, reject) => {
      Readable.from(buffer)
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', resolve);
    });

    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/collection-reports-v2/upload',
      1,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data: {
        imageFileId: String(uploadStream.id),
        imageName: filename,
        imageSize: file.size,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Upload failed';
    logRouteError(
      functionName,
      'POST',
      '/api/collection-reports-v2/upload',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1
    ? `.${parts[parts.length - 1].toLowerCase()}`
    : '.jpg';
}
