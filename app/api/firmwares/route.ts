import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Firmware } from '@/app/api/lib/models/firmware';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { FirmwareDocument } from '@/shared/types';
import { GridFSBucket, type Db } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

import {
  logRouteFetch,
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

/**
 * Main GET handler for fetching firmwares
 *
 * @param {boolean} includeDeleted - Whether to include archived firmware records
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const startTime = Date.now();
    const functionName = 'GET /api/firmwares';
    const user = extractUserFromRequest(request);
    try {
      // ============================================================================
      // STEP 1: Parse query parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const includeDeleted = searchParams.get('includeDeleted') === 'true';

      const query = includeDeleted
        ? {}
        : {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          };

      // ============================================================================
      // STEP 2: Fetch firmwares
      // ============================================================================
      const firmwares = await Firmware.find(query)
        .sort({ createdAt: -1 })
        .lean<FirmwareDocument[]>();
      // ============================================================================
      // STEP 3: Return success response
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/firmwares',
        firmwares.length,
        user,
        duration
      );
      return NextResponse.json(firmwares);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch firmwares';
      logRouteError(functionName, 'GET', '/api/firmwares', errorMessage, user);
      return NextResponse.json(
        { error: 'Failed to fetch firmwares' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/firmwares
 *
 * @body {FormData} product - Product name/identifier (REQUIRED)
 * @body {FormData} version - Firmware version string (REQUIRED)
 * @body {FormData} versionDetails - Description of version changes
 * @body {FormData} file - Binary firmware file (.bin only) (REQUIRED)
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser, db }) => {
    const startTime = Date.now();
    const functionName = 'POST /api/firmwares';
    const user = extractUserFromRequest(request);
    try {
      // ============================================================================
      // STEP 1: Connect to database and bucket
      // ============================================================================
      if (!db) throw new Error('Database connection failed');
      const bucket = new GridFSBucket(db as unknown as Db, {
        bucketName: 'firmwares',
      });

      // ============================================================================
      // STEP 2: Parse form data and validate
      // ============================================================================
      const formData = await request.formData();
      const product = formData.get('product') as string;
      const version = formData.get('version') as string;
      const versionDetails = formData.get('versionDetails') as string;
      const file = formData.get('file') as File;

      if (!product || !version || !file) {
        return NextResponse.json(
          { error: 'Product, version, and file are required' },
          { status: 400 }
        );
      }

      if (!file.name.endsWith('.bin')) {
        return NextResponse.json(
          { error: 'Only .bin files are allowed' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Prepare file for upload
      // ============================================================================
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);

      // ============================================================================
      // STEP 4: Upload file to GridFS
      // ============================================================================
      const uploadStream = bucket.openUploadStream(file.name, {
        metadata: {
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedAt: new Date(),
        },
      });

      const fileId = uploadStream.id;
      await new Promise((resolve, reject) => {
        stream.pipe(uploadStream).on('error', reject).on('finish', resolve);
      });

      // ============================================================================
      // STEP 5: Create firmware entry
      // ============================================================================
      const firmwareId = await generateMongoId();
      const firmware = new Firmware({
        _id: firmwareId,
        product,
        version,
        versionDetails: versionDetails || '',
        fileId,
        fileName: file.name,
        fileSize: file.size,
        deletedAt: new Date(-1),
        releaseDate: new Date(),
        description: versionDetails || '',
        downloadUrl: '',
        checksum: '',
      });

      await firmware.save();

      const duration = Date.now() - startTime;
      logRouteCreate(functionName, 'POST', '/api/firmwares', 1, user, duration);

      // ============================================================================
      // STEP 6: Log activity
      // ============================================================================
      if (currentUser && currentUser.emailAddress) {
        await logActivity({
          action: 'CREATE',
          details: `Uploaded new firmware "${product} v${version}" (${file.name})`,
          ipAddress: getClientIP(request) || undefined,
          userId: currentUser._id,
          username: currentUser.username || currentUser.emailAddress,

          metadata: {
            resource: 'Firmware',
            resourceId: firmwareId,
            resourceName: `${product} v${version}`,
            changes: [
              { field: 'product', oldValue: null, newValue: product },
              { field: 'version', oldValue: null, newValue: version },
              { field: 'fileName', oldValue: null, newValue: file.name },
            ],
          },
        });
      }

      // ============================================================================
      // STEP 7: Return success response
      // ============================================================================
      return NextResponse.json(firmware, { status: 201 });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload firmware';
      logRouteError(functionName, 'POST', '/api/firmwares', errorMessage, user);
      return NextResponse.json(
        { error: 'Failed to upload firmware' },
        { status: 500 }
      );
    }
  });
}
